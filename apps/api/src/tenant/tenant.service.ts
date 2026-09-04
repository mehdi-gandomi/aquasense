import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
  type OnModuleInit,
} from '@nestjs/common';
import { hashSync } from 'bcryptjs';
import {
  FACILITIES,
  TEMPLATE_BY_KIND,
  cloneEquipment,
  cloneSensors,
  registerEquipment,
  registerSensors,
  type Facility,
  type FacilityId,
  type FacilityKind,
} from '@aquasense/shared';
import { HistoryService } from '../history/history.service';
import { PlantService } from '../plant/plant.service';
import { ClientEntity } from './entities/client.entity';
import { BuildingEntity } from './entities/building.entity';
import { UserEntity } from './entities/user.entity';
import { UserBuildingEntity } from './entities/user-building.entity';
import type { AuthUser, ClientDto, PlantDto, UserDto, UserRole } from './tenant.types';

const SEED_COORDS: Record<string, { lat: number; lng: number; address: string }> = {
  'northfield-wrrf': {
    lat: 53.4808,
    lng: -2.2426,
    address: 'Northfield Catchment, WRRF gate 2',
  },
  'eastbank-industrial': {
    lat: 53.4084,
    lng: -2.9916,
    address: 'Eastbank Trade Estate, dock 4',
  },
  'highland-reservoir': {
    lat: 56.4907,
    lng: -4.2026,
    address: 'Highland Reservoir dam road',
  },
};

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function nid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

@Injectable()
export class TenantService implements OnModuleInit {
  private readonly logger = new Logger(TenantService.name);

  private clients: ClientDto[] = [];
  private plants: PlantDto[] = [];
  private users: Array<UserDto & { passwordHash: string }> = [];

  constructor(
    private readonly history: HistoryService,
    @Inject(forwardRef(() => PlantService)) private readonly plant: PlantService,
  ) {}

  async onModuleInit() {
    await this.history.ready;
    await this.hydrate();
  }

  listFacilities(): Facility[] {
    return this.plants.length ? this.plants : FACILITIES;
  }

  getPlant(id: string): PlantDto | undefined {
    return this.plants.find((p) => p.id === id);
  }

  knownPlant(id: string): boolean {
    return this.plants.some((p) => p.id === id) || FACILITIES.some((f) => f.id === id);
  }

  allowedPlants(user: AuthUser): FacilityId[] {
    if (user.role === 'ADMIN') return this.listFacilities().map((p) => p.id);
    return user.plantIds.filter((id) => this.knownPlant(id));
  }

  canAccess(user: AuthUser, facilityId: string): boolean {
    return this.allowedPlants(user).includes(facilityId);
  }

  firstAllowed(user: AuthUser): FacilityId {
    return this.allowedPlants(user)[0] ?? 'northfield-wrrf';
  }

  listClients(): ClientDto[] {
    return this.clients;
  }

  listPlants(): PlantDto[] {
    return this.plants;
  }

  listUsers(): UserDto[] {
    return this.users.map(({ passwordHash: _, ...u }) => u);
  }

  findUserByEmail(email: string) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id: string) {
    return this.users.find((u) => u.id === id);
  }

  async createClient(input: Omit<ClientDto, 'id'> & { id?: string }): Promise<ClientDto> {
    const row: ClientDto = {
      id: input.id ?? nid('cli'),
      name: input.name,
      contact: input.contact ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
    };
    this.clients.push(row);
    await this.persistClient(row);
    return row;
  }

  async updateClient(id: string, patch: Partial<ClientDto>): Promise<ClientDto> {
    const row = this.clients.find((c) => c.id === id);
    if (!row) throw new NotFoundException(`Unknown client ${id}`);
    Object.assign(row, patch, { id: row.id });
    await this.persistClient(row);
    return row;
  }

  async deleteClient(id: string) {
    if (this.plants.some((p) => p.clientId === id)) {
      throw new BadRequestException('Client still has plants — remove them first');
    }
    const removedUsers = this.users.filter((u) => u.clientId === id);
    this.clients = this.clients.filter((c) => c.id !== id);
    this.users = this.users.filter((u) => u.clientId !== id);
    const ds = this.history.dataSource;
    if (ds?.isInitialized) {
      for (const user of removedUsers) {
        await ds.getRepository(UserBuildingEntity).delete({ userId: user.id });
        await ds.getRepository(UserEntity).delete({ id: user.id });
      }
      await ds.getRepository(ClientEntity).delete({ id });
    }
  }

  async createPlant(input: {
    id?: string;
    clientId: string;
    name: string;
    shortName?: string;
    code?: string;
    kind: FacilityKind;
    templateKind?: FacilityKind;
    address?: string;
    lat?: number;
    lng?: number;
    designFlow?: number;
    population?: number;
    commissioned?: number;
  }): Promise<PlantDto> {
    if (!this.clients.some((c) => c.id === input.clientId)) {
      throw new NotFoundException(`Unknown client ${input.clientId}`);
    }
    const kind = input.kind;
    const templateKind = input.templateKind;
    let id = input.id ?? (slug(input.code || input.shortName || input.name) || nid('plant'));
    if (this.plants.some((p) => p.id === id)) id = nid('plant');
    const row: PlantDto = {
      id,
      clientId: input.clientId,
      name: input.name,
      shortName: input.shortName ?? input.name,
      code: input.code ?? id.slice(0, 8).toUpperCase(),
      kind,
      templateKind,
      hasFullTwin: kind === 'wrrf',
      designFlow: input.designFlow ?? 0,
      population: input.population ?? 0,
      commissioned: input.commissioned ?? new Date().getFullYear(),
      address: input.address,
      lat: input.lat,
      lng: input.lng,
    };
    this.plants.push(row);
    this.applyTemplate(row);
    await this.persistPlant(row);
    return row;
  }

  async updatePlant(id: string, patch: Partial<PlantDto>): Promise<PlantDto> {
    const row = this.plants.find((p) => p.id === id);
    if (!row) throw new NotFoundException(`Unknown plant ${id}`);
    Object.assign(row, patch, { id: row.id });
    await this.persistPlant(row);
    return row;
  }

  async deletePlant(id: string) {
    if (FACILITIES.some((f) => f.id === id)) {
      throw new NotFoundException('Seed plants cannot be deleted');
    }
    this.plants = this.plants.filter((p) => p.id !== id);
    for (const user of this.users) {
      user.plantIds = user.plantIds.filter((p) => p !== id);
    }
    const ds = this.history.dataSource;
    if (ds?.isInitialized) {
      await ds.getRepository(UserBuildingEntity).delete({ buildingId: id });
      await ds.getRepository(BuildingEntity).delete({ id });
    }
  }

  async createUser(input: {
    email: string;
    name: string;
    password: string;
    role: UserRole;
    clientId?: string | null;
    plantIds?: string[];
  }): Promise<UserDto> {
    if (this.findUserByEmail(input.email)) {
      throw new ConflictException('Email already in use');
    }
    const row = {
      id: nid('usr'),
      email: input.email.toLowerCase(),
      name: input.name,
      role: input.role,
      clientId: input.role === 'ADMIN' ? null : (input.clientId ?? null),
      plantIds: input.role === 'ADMIN' ? [] : (input.plantIds ?? []),
      passwordHash: hashSync(input.password, 10),
    };
    this.users.push(row);
    await this.persistUser(row);
    const { passwordHash: _, ...dto } = row;
    return dto;
  }

  async updateUser(
    id: string,
    patch: Partial<{
      name: string;
      email: string;
      password: string;
      role: UserRole;
      clientId: string | null;
      plantIds: string[];
    }>,
  ): Promise<UserDto> {
    const row = this.users.find((u) => u.id === id);
    if (!row) throw new NotFoundException(`Unknown user ${id}`);
    if (patch.name) row.name = patch.name;
    if (patch.email) row.email = patch.email.toLowerCase();
    if (patch.role) row.role = patch.role;
    if (patch.clientId !== undefined) row.clientId = patch.clientId;
    if (patch.plantIds !== undefined) row.plantIds = patch.plantIds;
    if (patch.password) row.passwordHash = hashSync(patch.password, 10);
    await this.persistUser(row);
    const { passwordHash: _, ...dto } = row;
    return dto;
  }

  async deleteUser(id: string) {
    this.users = this.users.filter((u) => u.id !== id);
    const ds = this.history.dataSource;
    if (ds?.isInitialized) await ds.getRepository(UserEntity).delete({ id });
  }

  toAuthUser(row: UserDto & { passwordHash?: string }): AuthUser {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      clientId: row.clientId,
      plantIds: this.allowedPlants({
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        clientId: row.clientId,
        plantIds: row.plantIds,
      }),
    };
  }

  private applyTemplate(plant: PlantDto) {
    const seeded = FACILITIES.some((f) => f.id === plant.id);
    if (seeded) return;
    const templateKind = plant.templateKind;
    if (!templateKind) return;
    const templateId = TEMPLATE_BY_KIND[templateKind];
    if (!templateId) return;
    const sensors = cloneSensors(templateId, plant.id);
    const equipment = cloneEquipment(templateId, plant.id);
    registerSensors(sensors);
    registerEquipment(equipment);
    this.plant.adoptFacility(plant.id);
  }

  private async hydrate() {
    const ds = this.history.dataSource;
    if (ds?.isInitialized) {
      try {
        const clientCount = await ds.getRepository(ClientEntity).count();
        if (clientCount === 0) await this.seedDatabase();
        await this.loadFromDatabase();
        this.logger.log(`Tenant store: ${this.clients.length} clients, ${this.plants.length} plants`);
        return;
      } catch (error) {
        this.logger.warn(`Tenant DB load failed, using memory seed (${(error as Error).message})`);
      }
    }
    this.seedMemory();
    for (const p of this.plants) this.plant.adoptFacility(p.id);
    this.logger.warn('Tenant store running in memory (MySQL down or empty)');
  }

  private seedMemory() {
    this.clients = [
      {
        id: 'cli-demo',
        name: 'AQUASENSE Demo',
        contact: 'Control room',
        phone: null,
        notes: 'Seed client',
      },
    ];
    this.plants = FACILITIES.map((f) => ({
      ...f,
      clientId: 'cli-demo',
      ...SEED_COORDS[f.id],
      templateKind: f.kind,
    }));
    this.users = [
      {
        id: 'usr-admin',
        email: 'admin@aquasense.local',
        name: 'Platform Admin',
        role: 'ADMIN',
        clientId: null,
        plantIds: [],
        passwordHash: hashSync('admin123', 10),
      },
      {
        id: 'usr-nf',
        email: 'northfield@aquasense.local',
        name: 'Northfield Operator',
        role: 'CLIENT',
        clientId: 'cli-demo',
        plantIds: ['northfield-wrrf'],
        passwordHash: hashSync('operator123', 10),
      },
    ];
  }

  private async seedDatabase() {
    const ds = this.history.dataSource!;
    this.seedMemory();
    for (const c of this.clients) await ds.getRepository(ClientEntity).save(this.toClientRow(c));
    for (const p of this.plants) await ds.getRepository(BuildingEntity).save(this.toPlantRow(p));
    for (const u of this.users) {
      await ds.getRepository(UserEntity).save({
        id: u.id,
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        role: u.role,
        clientId: u.clientId,
      });
      for (const plantId of u.plantIds) {
        await ds.getRepository(UserBuildingEntity).save({ userId: u.id, buildingId: plantId });
      }
    }
    this.logger.log('Seeded demo client, three plants, admin + Northfield operator');
  }

  private async loadFromDatabase() {
    const ds = this.history.dataSource!;
    this.clients = (await ds.getRepository(ClientEntity).find()).map((c) => ({
      id: c.id,
      name: c.name,
      contact: c.contact,
      phone: c.phone,
      notes: c.notes,
    }));
    this.plants = (await ds.getRepository(BuildingEntity).find()).map((p) => this.fromPlantRow(p));
    const users = await ds.getRepository(UserEntity).find({ relations: ['buildings'] });
    this.users = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      clientId: u.clientId,
      plantIds: (u.buildings ?? []).map((x) => x.buildingId),
      passwordHash: u.passwordHash,
    }));
    for (const p of this.plants) {
      this.applyTemplate(p);
      this.plant.adoptFacility(p.id);
    }
  }

  private async persistClient(row: ClientDto) {
    const ds = this.history.dataSource;
    if (ds?.isInitialized) await ds.getRepository(ClientEntity).save(this.toClientRow(row));
  }

  private async persistPlant(row: PlantDto) {
    const ds = this.history.dataSource;
    if (ds?.isInitialized) await ds.getRepository(BuildingEntity).save(this.toPlantRow(row));
  }

  private async persistUser(row: UserDto & { passwordHash: string }) {
    const ds = this.history.dataSource;
    if (!ds?.isInitialized) return;
    await ds.getRepository(UserEntity).save({
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.passwordHash,
      role: row.role,
      clientId: row.clientId,
    });
    await ds.getRepository(UserBuildingEntity).delete({ userId: row.id });
    for (const plantId of row.plantIds) {
      await ds.getRepository(UserBuildingEntity).save({ userId: row.id, buildingId: plantId });
    }
  }

  private toClientRow(c: ClientDto): ClientEntity {
    return Object.assign(new ClientEntity(), c);
  }

  private toPlantRow(p: PlantDto): BuildingEntity {
    return Object.assign(new BuildingEntity(), {
      id: p.id,
      clientId: p.clientId,
      name: p.name,
      shortName: p.shortName,
      code: p.code,
      kind: p.kind,
      templateKind: p.templateKind ?? null,
      hasFullTwin: p.hasFullTwin,
      designFlow: p.designFlow,
      population: p.population,
      commissioned: p.commissioned,
      address: p.address ?? null,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
    });
  }

  private fromPlantRow(p: BuildingEntity): PlantDto {
    return {
      id: p.id,
      clientId: p.clientId,
      name: p.name,
      shortName: p.shortName,
      code: p.code,
      kind: p.kind as FacilityKind,
      templateKind: (p.templateKind as FacilityKind) ?? undefined,
      hasFullTwin: p.hasFullTwin,
      designFlow: p.designFlow,
      population: p.population,
      commissioned: p.commissioned,
      address: p.address ?? undefined,
      lat: p.lat ?? undefined,
      lng: p.lng ?? undefined,
    };
  }
}

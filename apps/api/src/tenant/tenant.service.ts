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
  catalogueSensors,
  cloneEquipment,
  cloneSensors,
  getSensor,
  registerEquipment,
  registerSensors,
  sensorsForFacility,
  unregisterSensor,
  type Facility,
  type FacilityId,
  type FacilityKind,
  type SensorDef,
} from '@aquasense/shared';
import { HistoryService } from '../history/history.service';
import { PlantService } from '../plant/plant.service';
import { ClientEntity } from './entities/client.entity';
import { BuildingEntity } from './entities/building.entity';
import { UserEntity } from './entities/user.entity';
import { UserBuildingEntity } from './entities/user-building.entity';
import { PlantSensorEntity } from './entities/plant-sensor.entity';
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
  /** In-memory fallback for map-placed sensors when MySQL is down. */
  private mapSensors: SensorDef[] = [];

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
    for (const sensor of sensorsForFacility(id)) {
      if (sensor.source === 'catalogue' || sensor.source === 'custom') {
        unregisterSensor(sensor.id);
      }
    }
    this.mapSensors = this.mapSensors.filter((s) => s.facilityId !== id);
    const ds = this.history.dataSource;
    if (ds?.isInitialized) {
      await ds.getRepository(PlantSensorEntity).delete({ facilityId: id });
      await ds.getRepository(UserBuildingEntity).delete({ buildingId: id });
      await ds.getRepository(BuildingEntity).delete({ id });
    }
  }

  catalogueForPlant(plantId: string): SensorDef[] {
    const plant = this.getPlant(plantId);
    if (!plant) throw new NotFoundException(`Unknown plant ${plantId}`);
    const templateKind = plant.templateKind ?? plant.kind;
    const templateId = TEMPLATE_BY_KIND[templateKind];
    if (!templateId) return [];
    return catalogueSensors(templateId);
  }

  listPlantSensors(plantId: string): SensorDef[] {
    if (!this.getPlant(plantId)) throw new NotFoundException(`Unknown plant ${plantId}`);
    return sensorsForFacility(plantId);
  }

  listMapSensors(plantId?: string): SensorDef[] {
    const plants = plantId ? this.plants.filter((p) => p.id === plantId) : this.plants;
    const byId = new Map<string, SensorDef>();
    for (const p of plants) {
      for (const s of sensorsForFacility(p.id)) {
        if (s.lat != null && s.lng != null) byId.set(s.id, s);
      }
    }
    return [...byId.values()];
  }

  async createPlantSensor(
    plantId: string,
    input:
      | {
          mode: 'catalogue';
          templateSensorId: string;
          lat: number;
          lng: number;
          label?: string;
        }
      | {
          mode: 'custom';
          label: string;
          parameter: string;
          unit: string;
          min: number;
          max: number;
          decimals?: number;
          warnLow?: number;
          warnHigh?: number;
          critLow?: number;
          critHigh?: number;
          target?: number;
          lat: number;
          lng: number;
        },
  ): Promise<SensorDef> {
    const plant = this.getPlant(plantId);
    if (!plant) throw new NotFoundException(`Unknown plant ${plantId}`);

    let def: SensorDef;
    if (input.mode === 'catalogue') {
      const templateId = TEMPLATE_BY_KIND[plant.templateKind ?? plant.kind];
      const template =
        getSensor(input.templateSensorId) ??
        (templateId
          ? catalogueSensors(templateId).find((s) => s.id === input.templateSensorId)
          : undefined);
      if (!template) {
        throw new NotFoundException(`Unknown catalogue sensor ${input.templateSensorId}`);
      }
      const slugPart = slug(input.label || template.id).slice(0, 40) || 'sensor';
      def = {
        ...template,
        id: `${plantId}__map__${slugPart}-${Math.random().toString(36).slice(2, 7)}`,
        facilityId: plantId,
        nodeId: 'map',
        label: input.label ?? template.label,
        lat: input.lat,
        lng: input.lng,
        source: 'catalogue',
        pinned: false,
      };
    } else {
      const min = input.min;
      const max = input.max;
      def = {
        id: `${plantId}__map__${slug(input.label) || nid('sns')}`,
        facilityId: plantId,
        nodeId: 'map',
        parameter: input.parameter,
        label: input.label,
        unit: input.unit,
        min,
        max,
        decimals: input.decimals ?? 2,
        base: min + (max - min) * 0.5,
        amp: (max - min) * 0.04,
        warnLow: input.warnLow,
        warnHigh: input.warnHigh,
        critLow: input.critLow,
        critHigh: input.critHigh,
        target: input.target,
        seed: Math.random() * 1000,
        pinned: false,
        lat: input.lat,
        lng: input.lng,
        source: 'custom',
      };
    }

    if (getSensor(def.id)) {
      def = { ...def, id: `${def.id}-${Math.random().toString(36).slice(2, 5)}` };
    }

    registerSensors([def]);
    this.mapSensors = this.mapSensors.filter((s) => s.id !== def.id).concat(def);
    await this.persistMapSensor(def);
    return def;
  }

  async updatePlantSensor(
    plantId: string,
    sensorId: string,
    patch: Partial<
      Pick<
        SensorDef,
        | 'label'
        | 'lat'
        | 'lng'
        | 'warnLow'
        | 'warnHigh'
        | 'critLow'
        | 'critHigh'
        | 'target'
        | 'min'
        | 'max'
        | 'unit'
        | 'parameter'
      >
    >,
  ): Promise<SensorDef> {
    if (!this.getPlant(plantId)) throw new NotFoundException(`Unknown plant ${plantId}`);
    const existing = getSensor(sensorId);
    if (!existing || existing.facilityId !== plantId) {
      throw new NotFoundException(`Unknown sensor ${sensorId}`);
    }
    if (existing.source !== 'catalogue' && existing.source !== 'custom') {
      throw new BadRequestException('Only map-placed sensors can be updated');
    }
    const next: SensorDef = { ...existing, ...patch, id: existing.id, facilityId: plantId };
    registerSensors([next]);
    this.mapSensors = this.mapSensors.map((s) => (s.id === sensorId ? next : s));
    await this.persistMapSensor(next);
    return next;
  }

  async deletePlantSensor(plantId: string, sensorId: string) {
    if (!this.getPlant(plantId)) throw new NotFoundException(`Unknown plant ${plantId}`);
    const existing = getSensor(sensorId);
    if (!existing || existing.facilityId !== plantId) {
      throw new NotFoundException(`Unknown sensor ${sensorId}`);
    }
    if (existing.source !== 'catalogue' && existing.source !== 'custom') {
      throw new BadRequestException('Seed template sensors cannot be deleted from the map');
    }
    unregisterSensor(sensorId);
    this.mapSensors = this.mapSensors.filter((s) => s.id !== sensorId);
    const ds = this.history.dataSource;
    if (ds?.isInitialized) {
      await ds.getRepository(PlantSensorEntity).delete({ id: sensorId, facilityId: plantId });
    }
    return { ok: true };
  }

  private async persistMapSensor(def: SensorDef) {
    const ds = this.history.dataSource;
    if (!ds?.isInitialized) return;
    await ds.getRepository(PlantSensorEntity).save(this.toSensorRow(def));
  }

  private async loadMapSensors() {
    const ds = this.history.dataSource;
    if (!ds?.isInitialized) return;
    const rows = await ds.getRepository(PlantSensorEntity).find();
    const defs = rows.map((r) => this.fromSensorRow(r));
    this.mapSensors = defs;
    registerSensors(defs);
  }

  private toSensorRow(s: SensorDef): PlantSensorEntity {
    return Object.assign(new PlantSensorEntity(), {
      id: s.id,
      facilityId: s.facilityId,
      nodeId: s.nodeId,
      parameter: s.parameter,
      label: s.label,
      unit: s.unit,
      min: s.min,
      max: s.max,
      decimals: s.decimals,
      base: s.base,
      amp: s.amp,
      diurnal: !!s.diurnal,
      warnLow: s.warnLow ?? null,
      warnHigh: s.warnHigh ?? null,
      critLow: s.critLow ?? null,
      critHigh: s.critHigh ?? null,
      target: s.target ?? null,
      seed: s.seed,
      pinned: !!s.pinned,
      lat: s.lat ?? null,
      lng: s.lng ?? null,
      source: s.source ?? 'custom',
    });
  }

  private fromSensorRow(r: PlantSensorEntity): SensorDef {
    return {
      id: r.id,
      facilityId: r.facilityId,
      nodeId: r.nodeId,
      parameter: r.parameter,
      label: r.label,
      unit: r.unit,
      min: r.min,
      max: r.max,
      decimals: r.decimals,
      base: r.base,
      amp: r.amp,
      diurnal: r.diurnal || undefined,
      warnLow: r.warnLow ?? undefined,
      warnHigh: r.warnHigh ?? undefined,
      critLow: r.critLow ?? undefined,
      critHigh: r.critHigh ?? undefined,
      target: r.target ?? undefined,
      seed: r.seed,
      pinned: r.pinned || undefined,
      lat: r.lat ?? undefined,
      lng: r.lng ?? undefined,
      source: (r.source as SensorDef['source']) ?? 'custom',
    };
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
    await this.loadMapSensors();
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

import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import type { FacilityKind } from '@aquasense/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantService } from './tenant.service';
import type { UserRole } from './tenant.types';
import { AlertsService } from '../alerts/alerts.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import type { Severity } from '@aquasense/shared';

class ClientBody {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class PlantBody {
  @IsString()
  clientId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsIn(['wrrf', 'pretreatment', 'reservoir'])
  kind: FacilityKind;

  @IsOptional()
  @IsIn(['wrrf', 'pretreatment', 'reservoir'])
  templateKind?: FacilityKind;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}

class UserBody {
  @IsString()
  email: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;

  @IsIn(['ADMIN', 'CLIENT'])
  role: UserRole;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  plantIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  buildingIds?: string[];
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly tenant: TenantService,
    private readonly alerts: AlertsService,
    private readonly telemetry: TelemetryService,
  ) {}

  @Get('fleet')
  fleet() {
    return this.tenant.listPlants().map((plant) => {
      const readings = this.telemetry.latestFor(plant.id);
      let warning = 0;
      let critical = 0;
      for (const reading of readings) {
        if (reading.severity === 'warning') warning += 1;
        if (reading.severity === 'critical') critical += 1;
      }
      const active = this.alerts.list(plant.id).filter((a) => a.state === 'ACTIVE');
      const severity: Severity =
        critical > 0 || active.some((a) => a.severity === 'critical')
          ? 'critical'
          : warning > 0 || active.some((a) => a.severity === 'warning')
            ? 'warning'
            : readings.length
              ? 'nominal'
              : 'offline';
      return {
        ...plant,
        warning,
        critical,
        instruments: readings.length,
        severity,
      };
    });
  }

  @Get('clients')
  clients() {
    return this.tenant.listClients();
  }

  @Get('clients/:id')
  client(@Param('id') id: string) {
    const row = this.tenant.listClients().find((c) => c.id === id);
    if (!row) throw new NotFoundException(`Unknown client ${id}`);
    return row;
  }

  @Post('clients')
  createClient(@Body() body: ClientBody) {
    return this.tenant.createClient({
      name: body.name,
      contact: body.contact ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
    });
  }

  @Patch('clients/:id')
  updateClient(@Param('id') id: string, @Body() body: Partial<ClientBody>) {
    return this.tenant.updateClient(id, body);
  }

  @Delete('clients/:id')
  deleteClient(@Param('id') id: string) {
    return this.tenant.deleteClient(id);
  }

  @Get(['plants', 'buildings'])
  plants() {
    return this.tenant.listPlants();
  }

  @Get(['plants/:id', 'buildings/:id'])
  plant(@Param('id') id: string) {
    const row = this.tenant.getPlant(id);
    if (!row) throw new NotFoundException(`Unknown plant ${id}`);
    return row;
  }

  @Post(['plants', 'buildings'])
  createPlant(@Body() body: PlantBody) {
    return this.tenant.createPlant(body);
  }

  @Patch(['plants/:id', 'buildings/:id'])
  updatePlant(@Param('id') id: string, @Body() body: Partial<PlantBody>) {
    return this.tenant.updatePlant(id, body);
  }

  @Delete(['plants/:id', 'buildings/:id'])
  deletePlant(@Param('id') id: string) {
    return this.tenant.deletePlant(id);
  }

  @Get('users')
  users() {
    return this.tenant.listUsers();
  }

  @Get('users/:id')
  user(@Param('id') id: string) {
    const row = this.tenant.listUsers().find((u) => u.id === id);
    if (!row) throw new NotFoundException(`Unknown user ${id}`);
    return row;
  }

  @Post('users')
  createUser(@Body() body: UserBody) {
    return this.tenant.createUser({
      email: body.email,
      name: body.name,
      password: body.password ?? 'changeme',
      role: body.role,
      clientId: body.clientId,
      plantIds: body.plantIds ?? body.buildingIds,
    });
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: Partial<UserBody>) {
    const { buildingIds, plantIds, ...rest } = body;
    return this.tenant.updateUser(id, {
      ...rest,
      plantIds: plantIds ?? buildingIds,
    });
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.tenant.deleteUser(id);
  }
}

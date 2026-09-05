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
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
  ValidateIf,
} from 'class-validator';
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

class CreatePlantSensorBody {
  @IsIn(['catalogue', 'custom'])
  mode: 'catalogue' | 'custom';

  @ValidateIf((o: CreatePlantSensorBody) => o.mode === 'catalogue')
  @IsString()
  templateSensorId?: string;

  @ValidateIf((o: CreatePlantSensorBody) => o.mode === 'custom')
  @IsString()
  label?: string;

  @ValidateIf((o: CreatePlantSensorBody) => o.mode === 'custom')
  @IsString()
  parameter?: string;

  @ValidateIf((o: CreatePlantSensorBody) => o.mode === 'custom')
  @IsString()
  unit?: string;

  @ValidateIf((o: CreatePlantSensorBody) => o.mode === 'custom')
  @IsNumber()
  min?: number;

  @ValidateIf((o: CreatePlantSensorBody) => o.mode === 'custom')
  @IsNumber()
  max?: number;

  @IsOptional()
  @IsNumber()
  decimals?: number;

  @IsOptional()
  @IsNumber()
  warnLow?: number;

  @IsOptional()
  @IsNumber()
  warnHigh?: number;

  @IsOptional()
  @IsNumber()
  critLow?: number;

  @IsOptional()
  @IsNumber()
  critHigh?: number;

  @IsOptional()
  @IsNumber()
  target?: number;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

class PatchPlantSensorBody {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsNumber()
  warnLow?: number;

  @IsOptional()
  @IsNumber()
  warnHigh?: number;

  @IsOptional()
  @IsNumber()
  critLow?: number;

  @IsOptional()
  @IsNumber()
  critHigh?: number;

  @IsOptional()
  @IsNumber()
  target?: number;

  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  parameter?: string;
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
      const mapSensors = this.tenant.listMapSensors(plant.id);
      return {
        ...plant,
        warning,
        critical,
        instruments: readings.length,
        severity,
        mapSensors,
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

  @Get('plants/:id/sensors')
  plantSensors(@Param('id') id: string) {
    const sensors = this.tenant.listPlantSensors(id);
    const readings = this.telemetry.latestFor(id);
    const byId = new Map(readings.map((r) => [r.sensorId, r]));
    return sensors.map((s) => {
      const reading = byId.get(s.id);
      return {
        ...s,
        value: reading?.value,
        severity: reading?.severity ?? 'offline',
        recordedAt: reading?.recordedAt,
      };
    });
  }

  @Get('plants/:id/catalogue')
  plantCatalogue(@Param('id') id: string) {
    return this.tenant.catalogueForPlant(id);
  }

  @Post('plants/:id/sensors')
  createPlantSensor(@Param('id') id: string, @Body() body: CreatePlantSensorBody) {
    if (body.mode === 'catalogue') {
      return this.tenant.createPlantSensor(id, {
        mode: 'catalogue',
        templateSensorId: body.templateSensorId!,
        lat: body.lat,
        lng: body.lng,
        label: body.label,
      });
    }
    return this.tenant.createPlantSensor(id, {
      mode: 'custom',
      label: body.label!,
      parameter: body.parameter!,
      unit: body.unit!,
      min: body.min!,
      max: body.max!,
      decimals: body.decimals,
      warnLow: body.warnLow,
      warnHigh: body.warnHigh,
      critLow: body.critLow,
      critHigh: body.critHigh,
      target: body.target,
      lat: body.lat,
      lng: body.lng,
    });
  }

  @Patch('plants/:id/sensors/:sensorId')
  updatePlantSensor(
    @Param('id') id: string,
    @Param('sensorId') sensorId: string,
    @Body() body: PatchPlantSensorBody,
  ) {
    return this.tenant.updatePlantSensor(id, sensorId, body);
  }

  @Delete('plants/:id/sensors/:sensorId')
  deletePlantSensor(@Param('id') id: string, @Param('sensorId') sensorId: string) {
    return this.tenant.deletePlantSensor(id, sensorId);
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

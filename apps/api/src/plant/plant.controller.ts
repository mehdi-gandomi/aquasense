import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  SENSORS,
  sensorsForFacility,
  type EquipmentCommand,
} from '@aquasense/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { scopedFacility } from '../auth/scope';
import { PlantService } from './plant.service';
import { TenantService } from '../tenant/tenant.service';
import { EquipmentCommandDto } from './dto/equipment-command.dto';
import type { AuthUser } from '../tenant/tenant.types';

@Controller()
@UseGuards(JwtAuthGuard)
export class PlantController {
  constructor(
    private readonly plant: PlantService,
    private readonly tenant: TenantService,
  ) {}

  @Get('facilities')
  facilities(@Req() req: { user: AuthUser }) {
    return this.tenant.listFacilities().filter((b) => this.tenant.canAccess(req.user, b.id));
  }

  @Get('sensors')
  sensors(@Query('facility') facility?: string, @Req() req?: { user: AuthUser }) {
    const facilityId = scopedFacility(this.tenant, req?.user, facility);
    const extra = sensorsForFacility(facilityId);
    return extra.length ? extra : SENSORS.filter((s) => s.facilityId === facilityId);
  }

  @Get('plant/state')
  state(@Query('facility') facility?: string, @Req() req?: { user: AuthUser }) {
    return this.plant.snapshot(scopedFacility(this.tenant, req?.user, facility));
  }

  @Get('plant/equipment')
  equipment(@Query('facility') facility?: string, @Req() req?: { user: AuthUser }) {
    const facilityId = scopedFacility(this.tenant, req?.user, facility);
    return this.plant.snapshot(facilityId).equipment;
  }

  @Post('plant/equipment/:id/command')
  command(
    @Param('id') id: string,
    @Body() body: EquipmentCommandDto,
    @Req() req: { user: AuthUser },
  ) {
    const existing = this.plant.get(id);
    if (!existing || !this.tenant.canAccess(req.user, existing.facilityId)) {
      throw new ForbiddenException();
    }
    return this.plant.execute(id, toCommand(body));
  }
}

function toCommand(body: EquipmentCommandDto): EquipmentCommand {
  if (body.command === 'setpoint') {
    return { command: 'setpoint', value: Number(body.value ?? 0) };
  }
  if (body.command === 'mode') {
    const raw = String(body.mode ?? body.value ?? 'AUTO');
    const value = raw === 'MANUAL' || raw === 'LOCKOUT' ? raw : 'AUTO';
    return { command: 'mode', value };
  }
  return { command: body.command };
}

import { Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Alert } from '@aquasense/shared';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { scopedFacility } from '../auth/scope';
import { TenantService } from '../tenant/tenant.service';
import type { AuthUser } from '../tenant/tenant.types';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(
    private readonly alerts: AlertsService,
    private readonly tenant: TenantService,
  ) {}

  @Get()
  list(
    @Query('facility') facility?: string,
    @Query('status') status?: Alert['state'],
    @Req() req?: { user: AuthUser },
  ) {
    return this.alerts.list(scopedFacility(this.tenant, req?.user, facility), status);
  }

  @Post(':id/ack')
  ack(@Param('id') id: string, @Req() req: { user: AuthUser }) {
    const alert = this.alerts.get(id);
    if (!alert || !this.tenant.canAccess(req.user, alert.facilityId)) {
      throw new ForbiddenException();
    }
    return this.alerts.ack(id);
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string, @Req() req: { user: AuthUser }) {
    const alert = this.alerts.get(id);
    if (!alert || !this.tenant.canAccess(req.user, alert.facilityId)) {
      throw new ForbiddenException();
    }
    return this.alerts.resolve(id);
  }
}

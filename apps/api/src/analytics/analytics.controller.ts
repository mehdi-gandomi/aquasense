import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { scopedFacility } from '../auth/scope';
import { TenantService } from '../tenant/tenant.service';
import type { AuthUser } from '../tenant/tenant.types';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly tenant: TenantService,
  ) {}

  @Get('wqi')
  wqi(@Query('facility') facilityId?: string, @Req() req?: { user: AuthUser }) {
    return this.analytics.wqi(scopedFacility(this.tenant, req?.user, facilityId));
  }

  @Get('compliance')
  compliance(@Query('facility') facilityId?: string, @Req() req?: { user: AuthUser }) {
    return this.analytics.compliance(scopedFacility(this.tenant, req?.user, facilityId));
  }

  @Get('bloom')
  bloom() {
    return this.analytics.bloom();
  }
}

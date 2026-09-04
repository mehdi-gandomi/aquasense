import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { scopedFacility } from '../auth/scope';
import { TenantService } from '../tenant/tenant.service';
import type { AuthUser } from '../tenant/tenant.types';

function parseMs(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  if (value.endsWith('ms')) return Number(value.slice(0, -2)) || fallback;
  if (value.endsWith('s')) return (Number(value.slice(0, -1)) || fallback / 1000) * 1000;
  if (value.endsWith('m')) return (Number(value.slice(0, -1)) || 1) * 60_000;
  return Number(value) || fallback;
}

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(
    private readonly history: HistoryService,
    private readonly tenant: TenantService,
  ) {}

  @Get('trend')
  async trend(
    @Query('facility') facilityId?: string,
    @Query('sensorId') sensorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('bucket') bucket?: string,
    @Req() req?: { user: AuthUser },
  ) {
    const now = Date.now();
    const facility = scopedFacility(this.tenant, req?.user, facilityId);
    return {
      connected: this.history.connected,
      points: sensorId
        ? await this.history.trend({
            facilityId: facility,
            sensorId,
            from: from ? Number(from) : now - 30 * 60_000,
            to: to ? Number(to) : now,
            bucketMs: parseMs(bucket, 30_000),
          })
        : [],
    };
  }

  @Get('replay')
  async replay(
    @Query('facility') facilityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('step') step?: string,
    @Req() req?: { user: AuthUser },
  ) {
    const now = Date.now();
    return {
      connected: this.history.connected,
      frames: await this.history.replay({
        facilityId: scopedFacility(this.tenant, req?.user, facilityId),
        from: from ? Number(from) : now - 10 * 60_000,
        to: to ? Number(to) : now,
        stepMs: parseMs(step, 5000),
      }),
    };
  }
}

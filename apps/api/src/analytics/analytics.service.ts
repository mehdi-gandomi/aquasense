import { Injectable } from '@nestjs/common';
import {
  assessBloom,
  computeWqi,
  getSensor,
  limitsForFacility,
  type FacilityId,
} from '@aquasense/shared';
import { TelemetryService } from '../telemetry/telemetry.service';
import { HistoryService } from '../history/history.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly telemetry: TelemetryService,
    private readonly history: HistoryService,
  ) {}

  wqi(facilityId: FacilityId) {
    const latest = this.mapLatest(facilityId);
    if (facilityId !== 'northfield-wrrf') {
      return { facilityId, wqi: null, note: 'WQI is defined for Northfield effluent only' };
    }
    return {
      facilityId,
      wqi: computeWqi({
        tss: latest['EFF-TSS-01'] ?? 0,
        bod: latest['EFF-BOD-01'] ?? 0,
        nh4: latest['EFF-NH4-01'] ?? 0,
        turbidity: latest['EFF-TRB-01'] ?? 0,
        do: latest['EFF-DO-01'] ?? 0,
      }),
    };
  }

  async compliance(facilityId: FacilityId) {
    const latest = this.mapLatest(facilityId);
    const now = Date.now();

    const items = await Promise.all(
      limitsForFacility(facilityId).map(async (limit) => {
        const inverted = limit.actionLevel > limit.limit;
        const windowMs =
          limit.window === '30d rolling'
            ? 30 * 86_400_000
            : limit.window === '7d rolling'
              ? 7 * 86_400_000
              : limit.window === '24h rolling'
                ? 86_400_000
                : 0;

        let value = latest[limit.sensorId] ?? 0;
        if (windowMs && this.history.connected) {
          const points = await this.history.trend({
            facilityId,
            sensorId: limit.sensorId,
            from: now - windowMs,
            to: now,
            bucketMs: Math.max(60_000, windowMs / 48),
          });
          if (points.length) {
            value = points.reduce((acc, p) => acc + p.value, 0) / points.length;
          }
        }

        const utilisation = inverted
          ? limit.limit / Math.max(value, 0.0001)
          : value / limit.limit;
        const breached = inverted ? value < limit.limit : value > limit.limit;
        const nearing = inverted ? value < limit.actionLevel : value > limit.actionLevel;

        return {
          ...limit,
          value,
          utilisation,
          state: breached ? 'critical' : nearing ? 'warning' : 'nominal',
          inverted,
        };
      }),
    );

    return { facilityId, items, historyBacked: this.history.connected };
  }

  bloom() {
    const highland = this.mapLatest('highland-reservoir');
    const northfield = this.mapLatest('northfield-wrrf');
    return assessBloom({
      chlorophyll: highland['HR-CHL-01'] ?? 0,
      phycocyanin: highland['HR-PHY-01'] ?? 0,
      temperature: highland['HR-TMP-01'] ?? 0,
      totalNitrogen: highland['HR-TN-01'] ?? 0,
      totalPhosphorus: highland['HR-TP-01'] ?? 0,
      secchi: highland['HR-SDD-01'] ?? 0,
      dissolvedOxygen: highland['HR-DO-01'] ?? 0,
      upstreamNitrogenLoad: (northfield['EFF-TN-01'] ?? 0) * (northfield['EFF-FLW-01'] ?? 0) * 0.024,
    });
  }

  latestValue(sensorId: string): number {
    const sensor = getSensor(sensorId);
    const row = this.telemetry.latestFor(sensor?.facilityId ?? 'northfield-wrrf')
      .find((r) => r.sensorId === sensorId);
    return row?.value ?? sensor?.base ?? 0;
  }

  private mapLatest(facilityId: FacilityId): Record<string, number> {
    const out: Record<string, number> = {};
    for (const reading of this.telemetry.latestFor(facilityId)) {
      out[reading.sensorId] = reading.value;
    }
    return out;
  }
}

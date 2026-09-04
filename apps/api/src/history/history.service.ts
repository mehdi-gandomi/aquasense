import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import type { Alert, EventLogEntry, FacilityId, SensorReading } from '@aquasense/shared';
import { env } from '../config/env';
import { SensorReadingEntity } from './entities/sensor-reading.entity';
import { AlertRowEntity } from './entities/alert-row.entity';
import { EquipmentEventEntity } from './entities/equipment-event.entity';
import { ShiftReportEntity } from './entities/shift-report.entity';
import { ClientEntity } from '../tenant/entities/client.entity';
import { BuildingEntity } from '../tenant/entities/building.entity';
import { UserEntity } from '../tenant/entities/user.entity';
import { UserBuildingEntity } from '../tenant/entities/user-building.entity';

export const TENANT_ENTITIES = [ClientEntity, BuildingEntity, UserEntity, UserBuildingEntity];

export interface TrendPoint {
  t: number;
  value: number;
}

export interface ReplayFrame {
  t: number;
  readings: Record<string, number>;
}

@Injectable()
export class HistoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HistoryService.name);
  private ds?: DataSource;
  private flushTimer?: NodeJS.Timeout;
  private buffer: SensorReading[] = [];

  connected = false;
  private resolveReady!: () => void;
  readonly ready = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });

  get dataSource() {
    return this.ds;
  }

  async onModuleInit() {
    if (!env.dbEnabled) {
      this.logger.warn('MySQL disabled (DB_ENABLED=false) — history is in-memory only');
      this.resolveReady();
      return;
    }

    try {
      this.ds = new DataSource({
        type: 'mysql',
        host: env.mysqlHost,
        port: env.mysqlPort,
        username: env.mysqlUser,
        password: env.mysqlPassword,
        database: env.mysqlDatabase,
        entities: [
          SensorReadingEntity,
          AlertRowEntity,
          EquipmentEventEntity,
          ShiftReportEntity,
          ...TENANT_ENTITIES,
        ],
        synchronize: true,
        extra: { connectTimeout: 4000 },
      });
      await this.ds.initialize();
      this.connected = true;
      this.flushTimer = setInterval(() => void this.flush(), env.historyFlushMs);
      this.logger.log(`MySQL connected ${env.mysqlHost}:${env.mysqlPort}/${env.mysqlDatabase}`);
    } catch (error) {
      this.connected = false;
      this.logger.error(
        `MySQL unavailable — API stays up without history (${(error as Error).message})`,
      );
    } finally {
      this.resolveReady();
    }
  }

  onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    void this.flush();
    void this.ds?.destroy();
  }

  enqueue(readings: SensorReading[]) {
    if (!this.connected) return;
    this.buffer.push(...readings);
    if (this.buffer.length > 4000) void this.flush();
  }

  async persistAlert(alert: Alert) {
    if (!this.connected || !this.ds) return;
    try {
      await this.alerts().save({
        id: alert.id,
        facilityId: alert.facilityId,
        sensorId: alert.sensorId ?? null,
        equipmentId: alert.equipmentId ?? null,
        nodeId: alert.nodeId ?? null,
        severity: alert.severity,
        code: alert.code,
        message: alert.message,
        value: alert.value ?? null,
        raisedAt: String(alert.raisedAt),
        state: alert.state,
      });
    } catch (error) {
      this.logger.warn(`Alert persist failed: ${(error as Error).message}`);
    }
  }

  async persistEvent(entry: EventLogEntry) {
    if (!this.connected || !this.ds) return;
    try {
      await this.events().save({
        id: entry.id,
        facilityId: entry.facilityId,
        level: entry.level,
        source: entry.source,
        message: entry.message,
        at: String(entry.at),
      });
    } catch (error) {
      this.logger.warn(`Event persist failed: ${(error as Error).message}`);
    }
  }

  async saveReport(facilityId: FacilityId, notes: string, snapshot: unknown) {
    if (!this.connected || !this.ds) return null;
    const row = this.reports().create({
      facilityId,
      notes,
      snapshotJson: JSON.stringify(snapshot),
      createdAt: new Date(),
    });
    return this.reports().save(row);
  }

  async getReport(id: number) {
    if (!this.connected || !this.ds) return null;
    return this.reports().findOneBy({ id });
  }

  async trend(opts: {
    facilityId: FacilityId;
    sensorId: string;
    from: number;
    to: number;
    bucketMs: number;
  }): Promise<TrendPoint[]> {
    if (!this.connected || !this.ds) return [];

    const rows = await this.readings()
      .createQueryBuilder('r')
      .select('r.recordedAt', 'recordedAt')
      .addSelect('r.value', 'value')
      .where('r.facilityId = :facilityId', { facilityId: opts.facilityId })
      .andWhere('r.sensorId = :sensorId', { sensorId: opts.sensorId })
      .andWhere('r.recordedAt BETWEEN :from AND :to', {
        from: new Date(opts.from),
        to: new Date(opts.to),
      })
      .orderBy('r.recordedAt', 'ASC')
      .getRawMany<{ recordedAt: Date | string; value: number }>();

    const buckets = new Map<number, { sum: number; n: number }>();
    for (const row of rows) {
      const t = new Date(row.recordedAt).getTime();
      const key = Math.floor(t / opts.bucketMs) * opts.bucketMs;
      const cur = buckets.get(key) ?? { sum: 0, n: 0 };
      cur.sum += Number(row.value);
      cur.n += 1;
      buckets.set(key, cur);
    }

    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, v]) => ({ t, value: v.sum / v.n }));
  }

  async replay(opts: {
    facilityId: FacilityId;
    from: number;
    to: number;
    stepMs: number;
  }): Promise<ReplayFrame[]> {
    if (!this.connected || !this.ds) return [];

    const rows = await this.readings()
      .createQueryBuilder('r')
      .where('r.facilityId = :facilityId', { facilityId: opts.facilityId })
      .andWhere('r.recordedAt BETWEEN :from AND :to', {
        from: new Date(opts.from),
        to: new Date(opts.to),
      })
      .orderBy('r.recordedAt', 'ASC')
      .getMany();

    const frames = new Map<number, Record<string, number>>();
    for (const row of rows) {
      const t = Math.floor(new Date(row.recordedAt).getTime() / opts.stepMs) * opts.stepMs;
      const frame = frames.get(t) ?? {};
      frame[row.sensorId] = row.value;
      frames.set(t, frame);
    }

    return [...frames.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, readings]) => ({ t, readings }));
  }

  private readings(): Repository<SensorReadingEntity> {
    return this.ds!.getRepository(SensorReadingEntity);
  }

  private alerts(): Repository<AlertRowEntity> {
    return this.ds!.getRepository(AlertRowEntity);
  }

  private events(): Repository<EquipmentEventEntity> {
    return this.ds!.getRepository(EquipmentEventEntity);
  }

  private reports(): Repository<ShiftReportEntity> {
    return this.ds!.getRepository(ShiftReportEntity);
  }

  private async flush() {
    if (!this.connected || !this.ds || this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      await this.readings().insert(
        batch.map((r) => ({
          facilityId: r.facilityId,
          sensorId: r.sensorId,
          nodeId: r.nodeId,
          value: r.value,
          unit: r.unit,
          severity: r.severity,
          recordedAt: new Date(r.recordedAt),
        })),
      );
    } catch (error) {
      this.logger.warn(`History flush failed: ${(error as Error).message}`);
    }
  }
}

import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import {
  FACILITIES,
  SENSORS,
  getSensor,
  sensorsForFacility,
  roundTo,
  severityFor,
  simulateValue,
  type FacilityId,
  type SensorReading,
  type StreamMode,
  type StreamModePayload,
  type TelemetryBatch,
} from '@aquasense/shared';
import { env } from '../config/env';
import { PlantService } from '../plant/plant.service';
import { AlertsService } from '../alerts/alerts.service';
import { HistoryService } from '../history/history.service';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class TelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryService.name);
  private tickTimer?: NodeJS.Timeout;
  private watchTimer?: NodeJS.Timeout;

  private readonly streamModes = new Map<FacilityId, StreamMode>();
  private readonly lastMqtt = new Map<FacilityId, number>();
  private readonly latest = new Map<string, SensorReading>();
  private readonly liveBuffers = new Map<FacilityId, SensorReading[]>();

  readonly telemetry = new Subject<TelemetryBatch>();
  readonly streamMode = new Subject<StreamModePayload>();

  constructor(
    private readonly plant: PlantService,
    private readonly alerts: AlertsService,
    private readonly history: HistoryService,
    private readonly tenant: TenantService,
  ) {}

  onModuleInit() {
    for (const facility of this.sites()) {
      this.streamModes.set(facility.id, 'SIMULATED');
    }

    this.tickTimer = setInterval(() => this.tick(), env.simulationTickMs);
    this.watchTimer = setInterval(() => this.watchdog(), 1000);
    this.logger.log(`Simulation engine ${env.simulationTickMs}ms, MQTT watchdog ${env.mqttWatchdogMs}ms`);
  }

  onModuleDestroy() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.watchTimer) clearInterval(this.watchTimer);
  }

  modes(): Record<string, StreamMode> {
    return Object.fromEntries(this.streamModes);
  }

  latestFor(facilityId: FacilityId): SensorReading[] {
    return [...this.latest.values()].filter((r) => r.facilityId === facilityId);
  }

  /** Live MQTT packet. Flips that facility to LIVE and pauses its simulator. */
  ingestLive(partial: Omit<SensorReading, 'severity' | 'unit'> & { unit?: string }) {
    const sensor = getSensor(partial.sensorId);
    if (!sensor) return;

    const value = roundTo(partial.value, sensor.decimals);
    const reading: SensorReading = {
      facilityId: partial.facilityId,
      sensorId: sensor.id,
      nodeId: sensor.nodeId,
      value,
      unit: partial.unit ?? sensor.unit,
      severity: severityFor(sensor, value),
      recordedAt: partial.recordedAt,
    };

    this.lastMqtt.set(partial.facilityId, Date.now());
    this.setMode(partial.facilityId, 'LIVE');
    this.accept(reading);

    const buf = this.liveBuffers.get(partial.facilityId) ?? [];
    buf.push(reading);
    this.liveBuffers.set(partial.facilityId, buf);
  }

  private tick() {
    const now = Date.now();

    for (const facility of this.sites()) {
      const liveFlush = this.liveBuffers.get(facility.id) ?? [];
      if (liveFlush.length) {
        this.liveBuffers.set(facility.id, []);
        this.emit(facility.id, now, liveFlush);
      }

      if (this.streamModes.get(facility.id) === 'LIVE') continue;

      const influence = this.plant.influence(facility.id);
      const readings: SensorReading[] = [];

      const catalog = sensorsForFacility(facility.id);
      const sensors = catalog.length ? catalog : SENSORS.filter((s) => s.facilityId === facility.id);
      for (const sensor of sensors) {
        const value = roundTo(simulateValue(sensor, now, influence), sensor.decimals);
        readings.push({
          facilityId: sensor.facilityId,
          sensorId: sensor.id,
          nodeId: sensor.nodeId,
          value,
          unit: sensor.unit,
          severity: severityFor(sensor, value),
          recordedAt: now,
        });
      }

      for (const reading of readings) this.accept(reading);
      if (readings.length) this.emit(facility.id, now, readings);
    }
  }

  private accept(reading: SensorReading) {
    this.latest.set(reading.sensorId, reading);
    const sensor = getSensor(reading.sensorId);
    if (sensor) this.alerts.evaluate(sensor, reading);
  }

  private emit(facilityId: FacilityId, sentAt: number, readings: SensorReading[]) {
    this.history.enqueue(readings);
    this.telemetry.next({ facilityId, sentAt, readings });
  }

  private watchdog() {
    const now = Date.now();
    for (const facility of this.sites()) {
      const last = this.lastMqtt.get(facility.id);
      const live = last !== undefined && now - last < env.mqttWatchdogMs;
      this.setMode(facility.id, live ? 'LIVE' : 'SIMULATED');
    }
  }

  private sites() {
    const list = this.tenant.listFacilities();
    return list.length ? list : FACILITIES;
  }

  private setMode(facilityId: FacilityId, mode: StreamMode) {
    if (this.streamModes.get(facilityId) === mode) return;
    this.streamModes.set(facilityId, mode);
    this.streamMode.next({ facilityId, mode, since: Date.now() });
    this.logger.log(`${facilityId} stream → ${mode}`);
  }
}

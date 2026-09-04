import { Injectable, NotFoundException } from '@nestjs/common';
import { Subject } from 'rxjs';
import {
  severityFor,
  type Alert,
  type FacilityId,
  type SensorDef,
  type SensorReading,
} from '@aquasense/shared';
import { HistoryService } from '../history/history.service';
import { PlantService } from '../plant/plant.service';

interface Track {
  consecutive: number;
  alert: Alert | null;
}

const DEBOUNCE_TICKS = 3;

function deadband(sensor: SensorDef): number {
  return Math.max(0.001, (sensor.max - sensor.min) * 0.03);
}

function recovered(sensor: SensorDef, value: number): boolean {
  const band = deadband(sensor);
  if (sensor.critHigh !== undefined && value >= sensor.critHigh - band) return false;
  if (sensor.critLow !== undefined && value <= sensor.critLow + band) return false;
  if (sensor.warnHigh !== undefined && value >= sensor.warnHigh - band) return false;
  if (sensor.warnLow !== undefined && value <= sensor.warnLow + band) return false;
  return severityFor(sensor, value) === 'nominal';
}

/**
 * Threshold engine with debounce + hysteresis so a jittering value cannot
 * flood the operator tape.
 */
@Injectable()
export class AlertsService {
  private readonly track = new Map<string, Track>();
  private readonly board = new Map<string, Alert>();

  readonly raised = new Subject<Alert>();
  readonly updated = new Subject<Alert>();

  constructor(
    private readonly history: HistoryService,
    private readonly plant: PlantService,
  ) {}

  get(id: string): Alert | undefined {
    return this.board.get(id);
  }

  list(facilityId: FacilityId, status?: Alert['state']): Alert[] {
    return [...this.board.values()].filter(
      (a) => a.facilityId === facilityId && (!status || a.state === status),
    );
  }

  evaluate(sensor: SensorDef, reading: SensorReading) {
    const key = sensor.id;
    const state = this.track.get(key) ?? { consecutive: 0, alert: null };
    const breaching = reading.severity === 'warning' || reading.severity === 'critical';

    if (breaching) {
      state.consecutive += 1;
      if (state.consecutive >= DEBOUNCE_TICKS && !state.alert) {
        const alert = this.create(sensor, reading);
        state.alert = alert;
        this.board.set(alert.id, alert);
        this.raised.next(alert);
        void this.history.persistAlert(alert);
        this.plant.emitEvent(reading.facilityId, {
          level: reading.severity === 'critical' ? 'CRIT' : 'WARN',
          source: sensor.id,
          message: alert.message,
        });
      } else if (
        state.alert &&
        state.alert.state !== 'RESOLVED' &&
        reading.severity === 'critical' &&
        state.alert.severity === 'warning'
      ) {
        state.alert = {
          ...state.alert,
          severity: 'critical',
          code: 'LIMIT_CRITICAL',
          message: `${sensor.label} escalated to critical at ${reading.value}${reading.unit}`,
          value: reading.value,
        };
        this.board.set(state.alert.id, state.alert);
        this.updated.next(state.alert);
        void this.history.persistAlert(state.alert);
      }
    } else if (state.alert && state.alert.state !== 'RESOLVED' && recovered(sensor, reading.value)) {
      state.alert = { ...state.alert, state: 'RESOLVED', value: reading.value };
      this.board.set(state.alert.id, state.alert);
      this.updated.next(state.alert);
      void this.history.persistAlert(state.alert);
      this.plant.emitEvent(reading.facilityId, {
        level: 'INFO',
        source: sensor.id,
        message: `${sensor.label} recovered to ${reading.value}${reading.unit}`,
      });
      state.alert = null;
      state.consecutive = 0;
    } else if (!breaching) {
      state.consecutive = 0;
    }

    this.track.set(key, state);
  }

  ack(id: string): Alert {
    const alert = this.require(id);
    if (alert.state === 'RESOLVED') return alert;
    const next = { ...alert, state: 'ACKED' as const };
    this.board.set(id, next);
    const track = [...this.track.values()].find((t) => t.alert?.id === id);
    if (track) track.alert = next;
    this.updated.next(next);
    void this.history.persistAlert(next);
    this.plant.emitEvent(next.facilityId, {
      level: 'AUTO',
      source: 'OPS',
      message: `Acknowledged ${next.code}`,
    });
    return next;
  }

  resolve(id: string): Alert {
    const alert = this.require(id);
    const next = { ...alert, state: 'RESOLVED' as const };
    this.board.set(id, next);
    const entry = [...this.track.entries()].find(([, t]) => t.alert?.id === id);
    if (entry) {
      entry[1].alert = null;
      entry[1].consecutive = 0;
    }
    this.updated.next(next);
    void this.history.persistAlert(next);
    this.plant.emitEvent(next.facilityId, {
      level: 'INFO',
      source: 'OPS',
      message: `Resolved ${next.code}`,
    });
    return next;
  }

  private require(id: string): Alert {
    const alert = this.board.get(id);
    if (!alert) throw new NotFoundException(`Unknown alert ${id}`);
    return alert;
  }

  private create(sensor: SensorDef, reading: SensorReading): Alert {
    return {
      id: `${sensor.id}-${reading.recordedAt}`,
      facilityId: reading.facilityId,
      sensorId: sensor.id,
      nodeId: reading.nodeId,
      severity: reading.severity === 'critical' ? 'critical' : 'warning',
      code: reading.severity === 'critical' ? 'LIMIT_CRITICAL' : 'LIMIT_WARNING',
      message: `${sensor.label} at ${reading.value}${reading.unit} breached its ${reading.severity} threshold`,
      value: reading.value,
      raisedAt: reading.recordedAt,
      state: 'ACTIVE',
    };
  }
}

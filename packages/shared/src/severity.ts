import { SEVERITY_ORDER } from './types';
import type { SensorDef, Severity } from './types';

export function severityFor(sensor: SensorDef, value: number): Severity {
  if (!Number.isFinite(value)) return 'offline';

  if (
    (sensor.critLow !== undefined && value <= sensor.critLow) ||
    (sensor.critHigh !== undefined && value >= sensor.critHigh)
  ) {
    return 'critical';
  }

  if (
    (sensor.warnLow !== undefined && value <= sensor.warnLow) ||
    (sensor.warnHigh !== undefined && value >= sensor.warnHigh)
  ) {
    return 'warning';
  }

  return 'nominal';
}

/** Resolve the dominant state across a set of readings. */
export function worstSeverity(list: Severity[]): Severity {
  let worst: Severity = 'nominal';
  for (const s of list) {
    if (SEVERITY_ORDER.indexOf(s) > SEVERITY_ORDER.indexOf(worst)) worst = s;
  }
  return worst;
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  offline: '#5b7089',
  nominal: '#42b883',
  warning: '#f2a93b',
  critical: '#e65063',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  offline: 'OFFLINE',
  nominal: 'NOMINAL',
  warning: 'WARNING',
  critical: 'CRITICAL',
};

/** Position of a value inside its instrument range, as 0..1. */
export function rangeFraction(sensor: SensorDef, value: number): number {
  const span = sensor.max - sensor.min;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (value - sensor.min) / span));
}

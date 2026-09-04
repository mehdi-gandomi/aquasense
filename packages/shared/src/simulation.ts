import type { SensorDef } from './types';

/**
 * Deterministic plant simulation. Both the API and the browser fallback run this
 * exact function, so a client that loses the socket keeps drawing the same
 * waveform the server would have sent instead of jumping to a different reality.
 */

const HOUR_MS = 3_600_000;

function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth value noise in 0..1, drifting over ~9 second periods. */
function valueNoise(tMs: number, seed: number): number {
  const x = tMs / 9000 + seed * 17.31;
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i + seed);
  const b = hash(i + 1 + seed);
  const smooth = f * f * (3 - 2 * f);
  return a + (b - a) * smooth;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Municipal wastewater arrives on a strong daily rhythm: a morning peak as the
 * catchment wakes, a softer evening peak, and a deep trough overnight.
 */
export function diurnalFactor(tMs: number): number {
  const hours = (tMs / HOUR_MS) % 24;
  return (
    1 +
    0.24 * Math.sin(((hours - 6.5) / 24) * Math.PI * 2) +
    0.1 * Math.sin(((hours - 3) / 12) * Math.PI * 2)
  );
}

export interface SimulationInfluence {
  /** Multiplies aeration-linked parameters, driven by blower setpoint. */
  aeration?: number;
  /** Multiplies hydraulic parameters, driven by pump overrides. */
  hydraulic?: number;
  /** Multiplies chemical dosing linked parameters. */
  dosing?: number;
}

const AERATION_PARAMS = new Set(['do', 'nh4', 'orp', 'blower']);
const HYDRAULIC_PARAMS = new Set(['flow', 'level', 'dp', 'flux', 'throughput']);
const DOSING_PARAMS = new Set(['dosing', 'chlorine', 'tp']);

export function simulateValue(
  sensor: SensorDef,
  tMs: number,
  influence: SimulationInfluence = {},
): number {
  const seed = sensor.seed;

  const slow = (valueNoise(tMs, seed) - 0.5) * 2;
  const fast = Math.sin(tMs / 4200 + seed * 3.1) * 0.32;
  const ripple = Math.sin(tMs / 1150 + seed * 7.7) * 0.12;

  const load = sensor.diurnal ? diurnalFactor(tMs) : 1;

  let influenceFactor = 1;
  if (influence.aeration && AERATION_PARAMS.has(sensor.parameter)) {
    // Ammonium falls as aeration rises; everything else tracks it directly.
    influenceFactor =
      sensor.parameter === 'nh4' ? 1 / influence.aeration : influence.aeration;
  } else if (influence.hydraulic && HYDRAULIC_PARAMS.has(sensor.parameter)) {
    influenceFactor = influence.hydraulic;
  } else if (influence.dosing && DOSING_PARAMS.has(sensor.parameter)) {
    influenceFactor = sensor.parameter === 'tp' ? 1 / influence.dosing : influence.dosing;
  }

  const value =
    sensor.base * load * influenceFactor + sensor.amp * (slow * 0.68 + fast + ripple);

  return clamp(value, sensor.min, sensor.max);
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

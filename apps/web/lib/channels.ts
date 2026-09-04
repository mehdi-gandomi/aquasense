import {
  SENSORS,
  getSensor,
  severityFor,
  type SensorReading,
  type Severity,
} from '@aquasense/shared';

/**
 * Telemetry lives outside React on purpose.
 *
 * The 3D twin samples these channels every frame at 60fps, while the DOM only
 * re-renders on a throttled tick. Putting readings in React state would mean a
 * full reconciliation per socket batch, which is exactly what makes SCADA
 * dashboards stutter.
 */

export const RING_SIZE = 300;

export interface Channel {
  sensorId: string;
  value: number;
  /** Eased toward `value` each frame so animations glide between 1Hz samples. */
  display: number;
  severity: Severity;
  unit: string;
  updatedAt: number;
  ring: Float32Array;
  head: number;
  filled: number;
}

const channels = new Map<string, Channel>();

function createChannel(sensorId: string, seedValue: number, unit: string): Channel {
  const ring = new Float32Array(RING_SIZE);
  ring.fill(seedValue);
  return {
    sensorId,
    value: seedValue,
    display: seedValue,
    severity: 'nominal',
    unit,
    updatedAt: 0,
    ring,
    head: 0,
    filled: 0,
  };
}

/** Pre-seed every known sensor so the UI never renders empty slots. */
export function primeChannels() {
  for (const sensor of SENSORS) {
    if (!channels.has(sensor.id)) {
      channels.set(sensor.id, createChannel(sensor.id, sensor.base, sensor.unit));
    }
  }
}

export function ingest(readings: SensorReading[]) {
  for (const reading of readings) {
    let channel = channels.get(reading.sensorId);
    if (!channel) {
      channel = createChannel(reading.sensorId, reading.value, reading.unit);
      channels.set(reading.sensorId, channel);
    }

    channel.value = reading.value;
    channel.severity = reading.severity;
    channel.unit = reading.unit;
    channel.updatedAt = reading.recordedAt;
    channel.ring[channel.head] = reading.value;
    channel.head = (channel.head + 1) % RING_SIZE;
    channel.filled = Math.min(RING_SIZE, channel.filled + 1);
  }
}

export function getChannel(sensorId: string): Channel | undefined {
  return channels.get(sensorId);
}

/**
 * Scrubber position, in samples behind the write head. Held here rather than in
 * React so that one drag rewinds the entire console at once: the twin, every
 * tag, every sparkline and every KPI read through these accessors.
 */
let replayBack = 0;

export function setReplayBack(samples: number) {
  replayBack = Math.max(0, Math.round(samples));
}

export function getReplayBack(): number {
  return replayBack;
}

function historical(channel: Channel): number | null {
  if (replayBack <= 0) return null;
  if (channel.filled <= replayBack) return null;
  const idx = (channel.head - 1 - replayBack + RING_SIZE * 2) % RING_SIZE;
  return channel.ring[idx];
}

export function getValue(sensorId: string): number {
  const channel = channels.get(sensorId);
  if (!channel) return getSensor(sensorId)?.base ?? 0;
  return historical(channel) ?? channel.value;
}

/** Smoothed value, safe to drive geometry with. */
export function getDisplay(sensorId: string): number {
  const channel = channels.get(sensorId);
  if (!channel) return getSensor(sensorId)?.base ?? 0;
  return historical(channel) ?? channel.display;
}

export function getSeverity(sensorId: string): Severity {
  const channel = channels.get(sensorId);
  if (!channel) return 'offline';
  const sensor = getSensor(sensorId);
  return sensor ? severityFor(sensor, getValue(sensorId)) : channel.severity;
}

/** Ease every channel toward its latest sample. Called once per rendered frame. */
export function advanceSmoothing(delta: number) {
  const k = 1 - Math.exp(-delta * 3.4);
  for (const channel of channels.values()) {
    channel.display += (channel.value - channel.display) * k;
  }
}

/** Oldest-to-newest slice of the ring buffer, for sparklines. */
export function series(sensorId: string, count = 60): number[] {
  const channel = channels.get(sensorId);
  if (!channel) return [];
  const n = Math.min(count, channel.filled || count);
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const idx = (channel.head - n + i + RING_SIZE * 2) % RING_SIZE;
    out[i] = channel.ring[idx];
  }
  return out;
}

/** Normalised 0..1 position of a value within an arbitrary window. */
export function fraction(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

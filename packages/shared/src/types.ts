/** Core domain vocabulary shared by the SCADA core and the operator console. */

/** Plant id. Seeded sites keep the original slugs; admin-created sites use their own. */
export type FacilityId = string;

export type FacilityKind = 'wrrf' | 'pretreatment' | 'reservoir';

export interface Facility {
  id: FacilityId;
  name: string;
  shortName: string;
  code: string;
  kind: FacilityKind;
  /** Only the flagship plant renders the full liquid + sludge twin. */
  hasFullTwin: boolean;
  designFlow: number;
  population: number;
  commissioned: number;
  lat?: number;
  lng?: number;
  address?: string;
  clientId?: string;
  templateKind?: FacilityKind;
}

/** Ordered worst-last so `Math.max` over indices resolves the dominant state. */
export const SEVERITY_ORDER = ['offline', 'nominal', 'warning', 'critical'] as const;
export type Severity = (typeof SEVERITY_ORDER)[number];

export type StreamMode = 'LIVE' | 'SIMULATED' | 'LOCAL';

export type Pathway = 'liquid' | 'sludge' | 'gas' | 'recycle';

export type NodeKind =
  | 'intake'
  | 'screening'
  | 'clarifier'
  | 'aeration'
  | 'reactor'
  | 'filter'
  | 'uv'
  | 'outfall'
  | 'thickener'
  | 'digester'
  | 'gasholder'
  | 'chp'
  | 'dewatering'
  | 'silo'
  | 'reservoir';

export interface PlantNode {
  id: string;
  label: string;
  sub: string;
  kind: NodeKind;
  pathway: Pathway;
  /** Centre position in plant units (origin top-left of the 2400x1200 sheet). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0 = raw sewage, 1 = fully polished effluent. Drives the water colour ramp. */
  stage: number;
  /** Process-spine grouping. */
  group: 'preliminary' | 'primary' | 'secondary' | 'advanced' | 'solids';
}

export interface PlantPipe {
  id: string;
  from: string;
  to: string;
  pathway: Pathway;
  /** Optional intermediate routing points in plant units. */
  waypoints?: Array<[number, number]>;
  /** Sensor whose value modulates the flow animation speed. */
  flowSensorId?: string;
}

export interface SensorDef {
  id: string;
  facilityId: FacilityId;
  nodeId: string;
  parameter: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  decimals: number;
  /** Nominal operating value used by the simulation. */
  base: number;
  /** Oscillation amplitude around `base`. */
  amp: number;
  /** Whether the value follows the plant's diurnal load curve. */
  diurnal?: boolean;
  warnLow?: number;
  warnHigh?: number;
  critLow?: number;
  critHigh?: number;
  target?: number;
  /** Deterministic noise seed so every client renders the same waveform. */
  seed: number;
  /** Show this reading as a tag pinned to the twin. */
  pinned?: boolean;
  /** Geographic placement on the catchment map (admin-placed instruments). */
  lat?: number;
  lng?: number;
  /** Origin of the def: seed template, catalogue clone on map, or freeform custom. */
  source?: 'template' | 'catalogue' | 'custom';
}

export interface SensorReading {
  facilityId: FacilityId;
  sensorId: string;
  nodeId: string;
  value: number;
  unit: string;
  severity: Severity;
  recordedAt: number;
}

export type EquipmentMode = 'AUTO' | 'MANUAL' | 'LOCKOUT';

export type EquipmentKind =
  | 'pump'
  | 'blower'
  | 'scraper'
  | 'uv'
  | 'dosing'
  | 'valve'
  | 'centrifuge';

export interface EquipmentDef {
  id: string;
  facilityId: FacilityId;
  nodeId: string;
  label: string;
  kind: EquipmentKind;
  mode: EquipmentMode;
  running: boolean;
  setpoint: number;
  setpointUnit: string;
  setpointMin: number;
  setpointMax: number;
}

export interface Alert {
  id: string;
  facilityId: FacilityId;
  sensorId?: string;
  equipmentId?: string;
  nodeId?: string;
  severity: Exclude<Severity, 'nominal' | 'offline'>;
  code: string;
  message: string;
  value?: number;
  raisedAt: number;
  state: 'ACTIVE' | 'ACKED' | 'RESOLVED';
}

export interface EventLogEntry {
  id: string;
  facilityId: FacilityId;
  level: 'INFO' | 'WARN' | 'CRIT' | 'AUTO';
  source: string;
  message: string;
  at: number;
}

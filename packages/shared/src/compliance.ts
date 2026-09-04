import type { FacilityId } from './types';

/**
 * Discharge consent limits. `limit` is the regulatory ceiling, `window` describes
 * the averaging period the regulator assesses against.
 */
export interface ComplianceLimit {
  id: string;
  facilityId: FacilityId;
  sensorId: string;
  label: string;
  unit: string;
  limit: number;
  /** Internal action level, always tighter than the consent. */
  actionLevel: number;
  window: '24h rolling' | '7d rolling' | '30d rolling' | 'spot';
  authority: string;
}

export const COMPLIANCE_LIMITS: ComplianceLimit[] = [
  { id: 'cl-tss', facilityId: 'northfield-wrrf', sensorId: 'EFF-TSS-01', label: 'Suspended Solids', unit: 'mg/L', limit: 15, actionLevel: 10, window: '24h rolling', authority: 'EPA Consent 4412' },
  { id: 'cl-bod', facilityId: 'northfield-wrrf', sensorId: 'EFF-BOD-01', label: 'BOD5', unit: 'mg/L', limit: 18, actionLevel: 12, window: '24h rolling', authority: 'EPA Consent 4412' },
  { id: 'cl-nh4', facilityId: 'northfield-wrrf', sensorId: 'EFF-NH4-01', label: 'Ammoniacal N', unit: 'mg/L', limit: 3, actionLevel: 1.5, window: '24h rolling', authority: 'EPA Consent 4412' },
  { id: 'cl-tn', facilityId: 'northfield-wrrf', sensorId: 'EFF-TN-01', label: 'Total Nitrogen', unit: 'mg/L', limit: 15, actionLevel: 12, window: '30d rolling', authority: 'Nutrient Directive' },
  { id: 'cl-tp', facilityId: 'northfield-wrrf', sensorId: 'EFF-TP-01', label: 'Total Phosphorus', unit: 'mg/L', limit: 2, actionLevel: 1.2, window: '30d rolling', authority: 'Nutrient Directive' },
  { id: 'cl-trb', facilityId: 'northfield-wrrf', sensorId: 'EFF-TRB-01', label: 'Turbidity', unit: 'NTU', limit: 4, actionLevel: 2.5, window: 'spot', authority: 'EPA Consent 4412' },
  { id: 'cl-ph', facilityId: 'northfield-wrrf', sensorId: 'EFF-PH-01', label: 'pH Ceiling', unit: 'pH', limit: 9, actionLevel: 8.5, window: 'spot', authority: 'EPA Consent 4412' },
  { id: 'cl-cl2', facilityId: 'northfield-wrrf', sensorId: 'EFF-CL2-01', label: 'Residual Chlorine', unit: 'mg/L', limit: 1.2, actionLevel: 0.8, window: 'spot', authority: 'EPA Consent 4412' },
  { id: 'cl-uv', facilityId: 'northfield-wrrf', sensorId: 'UVD-DOS-01', label: 'UV Dose Floor', unit: 'mJ/cm2', limit: 25, actionLevel: 32, window: 'spot', authority: 'Disinfection Code' },

  { id: 'eb-cod', facilityId: 'eastbank-industrial', sensorId: 'EB-OCD-01', label: 'Discharge COD', unit: 'mg/L', limit: 1000, actionLevel: 700, window: '24h rolling', authority: 'Trade Effluent 88-C' },
  { id: 'eb-ph', facilityId: 'eastbank-industrial', sensorId: 'EB-PH-01', label: 'pH Range', unit: 'pH', limit: 10.5, actionLevel: 9, window: 'spot', authority: 'Trade Effluent 88-C' },
  { id: 'eb-tmp', facilityId: 'eastbank-industrial', sensorId: 'EB-TMP-01', label: 'Temperature', unit: 'C', limit: 48, actionLevel: 42, window: 'spot', authority: 'Trade Effluent 88-C' },
  { id: 'eb-oil', facilityId: 'eastbank-industrial', sensorId: 'EB-OIL-01', label: 'Oil & Grease', unit: 'mg/L', limit: 150, actionLevel: 100, window: 'spot', authority: 'Trade Effluent 88-C' },
];

export function limitsForFacility(facilityId: FacilityId): ComplianceLimit[] {
  return COMPLIANCE_LIMITS.filter((l) => l.facilityId === facilityId);
}

/** Composite water quality index, 0..100, weighted toward the consent drivers. */
export interface WqiInput {
  tss: number;
  bod: number;
  nh4: number;
  turbidity: number;
  do: number;
}

export function computeWqi(input: WqiInput): number {
  const score = (value: number, best: number, worst: number) =>
    Math.min(100, Math.max(0, ((worst - value) / (worst - best)) * 100));

  const parts = [
    { v: score(input.tss, 2, 20), w: 0.24 },
    { v: score(input.bod, 3, 25), w: 0.24 },
    { v: score(input.nh4, 0.2, 4), w: 0.22 },
    { v: score(input.turbidity, 0.5, 6), w: 0.16 },
    { v: score(10 - input.do, 10 - 9, 10 - 2), w: 0.14 },
  ];

  const total = parts.reduce((acc, p) => acc + p.v * p.w, 0);
  return Math.round(total * 10) / 10;
}

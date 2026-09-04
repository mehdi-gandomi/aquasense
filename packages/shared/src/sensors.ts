import type { FacilityId, SensorDef } from './types';

let seedCounter = 0;

interface SensorSpec extends Omit<SensorDef, 'facilityId' | 'seed'> {}

function def(facilityId: FacilityId, spec: SensorSpec): SensorDef {
  return { ...spec, facilityId, seed: (seedCounter += 7.13) };
}

/* ------------------------------------------------------------------ *
 * Northfield WRRF - the flagship plant driving the full digital twin.
 * ------------------------------------------------------------------ */

const NORTHFIELD: SensorDef[] = [
  // Influent works
  def('northfield-wrrf', { id: 'INF-FLW-01', nodeId: 'influent', parameter: 'flow', label: 'Inflow Rate', unit: 'm3/h', min: 0, max: 800, decimals: 0, base: 384, amp: 26, diurnal: true, warnHigh: 620, critHigh: 720, target: 420, pinned: true }),
  def('northfield-wrrf', { id: 'INF-PH-01', nodeId: 'influent', parameter: 'ph', label: 'Influent pH', unit: 'pH', min: 4, max: 10, decimals: 2, base: 7.24, amp: 0.22, warnLow: 6.5, warnHigh: 8.4, critLow: 6, critHigh: 9, target: 7.2, pinned: true }),
  def('northfield-wrrf', { id: 'INF-TMP-01', nodeId: 'influent', parameter: 'temperature', label: 'Influent Temp', unit: 'C', min: 0, max: 40, decimals: 1, base: 18.6, amp: 1.1, warnHigh: 28, critHigh: 33 }),
  def('northfield-wrrf', { id: 'INF-TSS-01', nodeId: 'influent', parameter: 'tss', label: 'Influent TSS', unit: 'mg/L', min: 0, max: 600, decimals: 0, base: 224, amp: 34, diurnal: true, warnHigh: 340, critHigh: 440, pinned: true }),
  def('northfield-wrrf', { id: 'INF-COD-01', nodeId: 'influent', parameter: 'cod', label: 'Influent COD', unit: 'mg/L', min: 0, max: 1200, decimals: 0, base: 528, amp: 72, diurnal: true, warnHigh: 820, critHigh: 980 }),
  def('northfield-wrrf', { id: 'INF-BOD-01', nodeId: 'influent', parameter: 'bod', label: 'Influent BOD5', unit: 'mg/L', min: 0, max: 600, decimals: 0, base: 262, amp: 38, diurnal: true, warnHigh: 400, critHigh: 500 }),
  def('northfield-wrrf', { id: 'INF-CND-01', nodeId: 'influent', parameter: 'conductivity', label: 'Conductivity', unit: 'uS/cm', min: 0, max: 3000, decimals: 0, base: 1140, amp: 90 }),

  // Preliminary treatment
  def('northfield-wrrf', { id: 'PRE-DPR-01', nodeId: 'preliminary', parameter: 'dp', label: 'Screen Diff. Press', unit: 'bar', min: 0, max: 1.5, decimals: 2, base: 0.28, amp: 0.07, warnHigh: 0.6, critHigh: 0.9, pinned: true }),
  def('northfield-wrrf', { id: 'PRE-LVL-01', nodeId: 'preliminary', parameter: 'level', label: 'Channel Level', unit: 'm', min: 0, max: 5, decimals: 2, base: 2.42, amp: 0.18, warnHigh: 3.6, critHigh: 4.3 }),
  def('northfield-wrrf', { id: 'PRE-GRT-01', nodeId: 'preliminary', parameter: 'efficiency', label: 'Grit Removal', unit: '%', min: 0, max: 100, decimals: 1, base: 92.4, amp: 2.2, warnLow: 85, critLow: 78 }),

  // Primary clarifier
  def('northfield-wrrf', { id: 'PRC-LVL-01', nodeId: 'primary', parameter: 'level', label: 'Basin Level', unit: 'm', min: 0, max: 6, decimals: 2, base: 4.18, amp: 0.14 }),
  def('northfield-wrrf', { id: 'PRC-TSS-01', nodeId: 'primary', parameter: 'tss', label: 'Primary Effl. TSS', unit: 'mg/L', min: 0, max: 300, decimals: 0, base: 88, amp: 14, warnHigh: 130, critHigh: 170, pinned: true }),
  def('northfield-wrrf', { id: 'PRC-BLK-01', nodeId: 'primary', parameter: 'blanket', label: 'Sludge Blanket', unit: 'm', min: 0, max: 3, decimals: 2, base: 0.82, amp: 0.16, warnHigh: 1.5, critHigh: 2.1, pinned: true }),
  def('northfield-wrrf', { id: 'PRC-EFF-01', nodeId: 'primary', parameter: 'efficiency', label: 'TSS Removal', unit: '%', min: 0, max: 100, decimals: 1, base: 61.8, amp: 4.2, warnLow: 50, critLow: 40 }),
  def('northfield-wrrf', { id: 'PRC-RPM-01', nodeId: 'primary', parameter: 'speed', label: 'Scraper Speed', unit: 'rpm', min: 0, max: 0.1, decimals: 3, base: 0.032, amp: 0.002 }),

  // Biological reactor
  def('northfield-wrrf', { id: 'BIO-DO-01', nodeId: 'bioreactor', parameter: 'do', label: 'Dissolved Oxygen', unit: 'mg/L', min: 0, max: 8, decimals: 2, base: 2.24, amp: 0.34, warnLow: 1.2, warnHigh: 3.6, critLow: 0.7, critHigh: 4.5, target: 2.2, pinned: true }),
  def('northfield-wrrf', { id: 'BIO-MLS-01', nodeId: 'bioreactor', parameter: 'mlss', label: 'MLSS', unit: 'mg/L', min: 0, max: 6000, decimals: 0, base: 3640, amp: 210, warnLow: 2600, warnHigh: 4600, critLow: 2000, critHigh: 5200, pinned: true }),
  def('northfield-wrrf', { id: 'BIO-ORP-01', nodeId: 'bioreactor', parameter: 'orp', label: 'Redox Potential', unit: 'mV', min: -400, max: 400, decimals: 0, base: 118, amp: 34 }),
  def('northfield-wrrf', { id: 'BIO-NH4-01', nodeId: 'bioreactor', parameter: 'nh4', label: 'Ammonium NH4-N', unit: 'mg/L', min: 0, max: 60, decimals: 2, base: 12.4, amp: 3.1, warnHigh: 22, critHigh: 32, pinned: true }),
  def('northfield-wrrf', { id: 'BIO-TMP-01', nodeId: 'bioreactor', parameter: 'temperature', label: 'Reactor Temp', unit: 'C', min: 0, max: 40, decimals: 1, base: 19.2, amp: 0.9 }),
  def('northfield-wrrf', { id: 'BIO-BLW-01', nodeId: 'bioreactor', parameter: 'blower', label: 'Blower Output', unit: '%', min: 0, max: 100, decimals: 0, base: 72, amp: 9, warnHigh: 92, critHigh: 98 }),
  def('northfield-wrrf', { id: 'BIO-SRT-01', nodeId: 'bioreactor', parameter: 'srt', label: 'Sludge Age', unit: 'd', min: 0, max: 40, decimals: 1, base: 12.6, amp: 1.1, warnLow: 7, critLow: 4 }),

  // Secondary clarifier
  def('northfield-wrrf', { id: 'SEC-SVI-01', nodeId: 'secondary', parameter: 'svi', label: 'Sludge Volume Index', unit: 'mL/g', min: 0, max: 300, decimals: 0, base: 112, amp: 16, warnHigh: 160, critHigh: 210, pinned: true }),
  def('northfield-wrrf', { id: 'SEC-BLK-01', nodeId: 'secondary', parameter: 'blanket', label: 'Sludge Blanket', unit: 'm', min: 0, max: 3, decimals: 2, base: 0.64, amp: 0.15, warnHigh: 1.4, critHigh: 2 }),
  def('northfield-wrrf', { id: 'SEC-TSS-01', nodeId: 'secondary', parameter: 'tss', label: 'Secondary TSS', unit: 'mg/L', min: 0, max: 80, decimals: 1, base: 12.2, amp: 3.4, warnHigh: 25, critHigh: 35, pinned: true }),
  def('northfield-wrrf', { id: 'SEC-RAS-01', nodeId: 'secondary', parameter: 'flow', label: 'RAS Flow', unit: 'm3/h', min: 0, max: 500, decimals: 0, base: 242, amp: 22, diurnal: true, pinned: true }),
  def('northfield-wrrf', { id: 'SEC-WAS-01', nodeId: 'secondary', parameter: 'flow', label: 'WAS Flow', unit: 'm3/h', min: 0, max: 80, decimals: 1, base: 18.4, amp: 2.6 }),

  // Nutrient removal
  def('northfield-wrrf', { id: 'NUT-NO3-01', nodeId: 'nutrient', parameter: 'no3', label: 'Nitrate NO3-N', unit: 'mg/L', min: 0, max: 40, decimals: 2, base: 6.18, amp: 1.4, warnHigh: 11, critHigh: 15, pinned: true }),
  def('northfield-wrrf', { id: 'NUT-TP-01', nodeId: 'nutrient', parameter: 'tp', label: 'Total Phosphorus', unit: 'mg/L', min: 0, max: 10, decimals: 2, base: 1.42, amp: 0.34, warnHigh: 2, critHigh: 3, target: 1, pinned: true }),
  def('northfield-wrrf', { id: 'NUT-TN-01', nodeId: 'nutrient', parameter: 'tn', label: 'Total Nitrogen', unit: 'mg/L', min: 0, max: 60, decimals: 2, base: 11.2, amp: 1.9, warnHigh: 15, critHigh: 20 }),
  def('northfield-wrrf', { id: 'NUT-DOS-01', nodeId: 'nutrient', parameter: 'dosing', label: 'Coagulant Dose', unit: 'L/h', min: 0, max: 60, decimals: 1, base: 18.2, amp: 3.4 }),

  // Advanced filtration
  def('northfield-wrrf', { id: 'FIL-TRB-01', nodeId: 'filtration', parameter: 'turbidity', label: 'Filtrate Turbidity', unit: 'NTU', min: 0, max: 12, decimals: 2, base: 1.82, amp: 0.52, warnHigh: 3, critHigh: 5, target: 1.5, pinned: true }),
  def('northfield-wrrf', { id: 'FIL-DPR-01', nodeId: 'filtration', parameter: 'dp', label: 'Membrane Diff. Press', unit: 'bar', min: 0, max: 3, decimals: 2, base: 0.92, amp: 0.22, warnHigh: 1.5, critHigh: 2.1, pinned: true }),
  def('northfield-wrrf', { id: 'FIL-FLX-01', nodeId: 'filtration', parameter: 'flux', label: 'Filtration Flux', unit: 'm/h', min: 0, max: 12, decimals: 2, base: 5.42, amp: 0.6 }),

  // UV disinfection
  def('northfield-wrrf', { id: 'UVD-INT-01', nodeId: 'uv', parameter: 'uv', label: 'UV Intensity', unit: 'mW/cm2', min: 0, max: 140, decimals: 0, base: 78, amp: 9, warnLow: 55, critLow: 40, pinned: true }),
  def('northfield-wrrf', { id: 'UVD-DOS-01', nodeId: 'uv', parameter: 'uvdose', label: 'UV Dose', unit: 'mJ/cm2', min: 0, max: 100, decimals: 0, base: 44, amp: 6, warnLow: 32, critLow: 25, target: 40, pinned: true }),
  def('northfield-wrrf', { id: 'UVD-UVT-01', nodeId: 'uv', parameter: 'uvt', label: 'UV Transmittance', unit: '%', min: 0, max: 100, decimals: 1, base: 68.4, amp: 3.6, warnLow: 58, critLow: 50 }),

  // Final effluent
  def('northfield-wrrf', { id: 'EFF-FLW-01', nodeId: 'effluent', parameter: 'flow', label: 'Effluent Flow', unit: 'm3/h', min: 0, max: 800, decimals: 0, base: 372, amp: 24, diurnal: true, pinned: true }),
  def('northfield-wrrf', { id: 'EFF-TSS-01', nodeId: 'effluent', parameter: 'tss', label: 'Effluent TSS', unit: 'mg/L', min: 0, max: 40, decimals: 1, base: 4.2, amp: 1.3, warnHigh: 10, critHigh: 15, target: 5, pinned: true }),
  def('northfield-wrrf', { id: 'EFF-BOD-01', nodeId: 'effluent', parameter: 'bod', label: 'Effluent BOD5', unit: 'mg/L', min: 0, max: 40, decimals: 1, base: 5.8, amp: 1.4, warnHigh: 12, critHigh: 18, target: 8 }),
  def('northfield-wrrf', { id: 'EFF-NH4-01', nodeId: 'effluent', parameter: 'nh4', label: 'Effluent NH4-N', unit: 'mg/L', min: 0, max: 10, decimals: 2, base: 0.62, amp: 0.26, warnHigh: 1.5, critHigh: 3, target: 1, pinned: true }),
  def('northfield-wrrf', { id: 'EFF-TN-01', nodeId: 'effluent', parameter: 'tn', label: 'Effluent TN', unit: 'mg/L', min: 0, max: 30, decimals: 2, base: 8.42, amp: 1.2, warnHigh: 12, critHigh: 15, target: 10 }),
  def('northfield-wrrf', { id: 'EFF-TP-01', nodeId: 'effluent', parameter: 'tp', label: 'Effluent TP', unit: 'mg/L', min: 0, max: 5, decimals: 2, base: 0.72, amp: 0.2, warnHigh: 1.2, critHigh: 2, target: 1 }),
  def('northfield-wrrf', { id: 'EFF-CL2-01', nodeId: 'effluent', parameter: 'chlorine', label: 'Residual Chlorine', unit: 'mg/L', min: 0, max: 2, decimals: 2, base: 0.44, amp: 0.12, warnLow: 0.2, warnHigh: 0.8, critLow: 0.1, critHigh: 1.2, target: 0.5, pinned: true }),
  def('northfield-wrrf', { id: 'EFF-TRB-01', nodeId: 'effluent', parameter: 'turbidity', label: 'Effluent Turbidity', unit: 'NTU', min: 0, max: 10, decimals: 2, base: 1.24, amp: 0.36, warnHigh: 2.5, critHigh: 4 }),
  def('northfield-wrrf', { id: 'EFF-PH-01', nodeId: 'effluent', parameter: 'ph', label: 'Effluent pH', unit: 'pH', min: 4, max: 10, decimals: 2, base: 7.12, amp: 0.14, warnLow: 6.5, warnHigh: 8.5, critLow: 6, critHigh: 9 }),
  def('northfield-wrrf', { id: 'EFF-DO-01', nodeId: 'effluent', parameter: 'do', label: 'Effluent DO', unit: 'mg/L', min: 0, max: 15, decimals: 2, base: 6.84, amp: 0.6, warnLow: 4, critLow: 2 }),

  // Thickener
  def('northfield-wrrf', { id: 'THK-SLD-01', nodeId: 'thickener', parameter: 'solids', label: 'Thickened Solids', unit: '%', min: 0, max: 12, decimals: 2, base: 4.82, amp: 0.42, warnLow: 3, critLow: 2, pinned: true }),
  def('northfield-wrrf', { id: 'THK-FLW-01', nodeId: 'thickener', parameter: 'flow', label: 'Sludge Flow', unit: 'm3/h', min: 0, max: 120, decimals: 1, base: 42.4, amp: 5.2, pinned: true }),
  def('northfield-wrrf', { id: 'THK-BLK-01', nodeId: 'thickener', parameter: 'blanket', label: 'Thickener Blanket', unit: 'm', min: 0, max: 4, decimals: 2, base: 1.86, amp: 0.22, warnHigh: 2.8, critHigh: 3.4 }),

  // Anaerobic digester
  def('northfield-wrrf', { id: 'DIG-TMP-01', nodeId: 'digester', parameter: 'temperature', label: 'Digester Temp', unit: 'C', min: 20, max: 50, decimals: 1, base: 37.2, amp: 0.5, warnLow: 34, warnHigh: 40, critLow: 31, critHigh: 43, target: 37, pinned: true }),
  def('northfield-wrrf', { id: 'DIG-PH-01', nodeId: 'digester', parameter: 'ph', label: 'Digester pH', unit: 'pH', min: 5, max: 9, decimals: 2, base: 7.14, amp: 0.11, warnLow: 6.6, warnHigh: 7.8, critLow: 6.2, critHigh: 8.2, pinned: true }),
  def('northfield-wrrf', { id: 'DIG-VS-01', nodeId: 'digester', parameter: 'efficiency', label: 'VS Destruction', unit: '%', min: 0, max: 100, decimals: 1, base: 56.4, amp: 3.4, warnLow: 45, critLow: 38 }),
  def('northfield-wrrf', { id: 'DIG-LVL-01', nodeId: 'digester', parameter: 'level', label: 'Digester Level', unit: '%', min: 0, max: 100, decimals: 1, base: 86.2, amp: 2.8, warnHigh: 95, critHigh: 98 }),

  // Biogas
  def('northfield-wrrf', { id: 'GAS-FLW-01', nodeId: 'gasholder', parameter: 'gasflow', label: 'Biogas Rate', unit: 'Nm3/h', min: 0, max: 400, decimals: 0, base: 212, amp: 24, warnLow: 120, critLow: 80, pinned: true }),
  def('northfield-wrrf', { id: 'GAS-CH4-01', nodeId: 'gasholder', parameter: 'methane', label: 'Methane Content', unit: '%', min: 0, max: 100, decimals: 1, base: 62.4, amp: 2.6, warnLow: 52, critLow: 45, pinned: true }),
  def('northfield-wrrf', { id: 'GAS-PRS-01', nodeId: 'gasholder', parameter: 'pressure', label: 'Holder Pressure', unit: 'mbar', min: 0, max: 60, decimals: 1, base: 18.4, amp: 2.2, warnHigh: 34, critHigh: 44 }),
  def('northfield-wrrf', { id: 'GAS-VOL-01', nodeId: 'gasholder', parameter: 'level', label: 'Holder Volume', unit: '%', min: 0, max: 100, decimals: 1, base: 72.4, amp: 8.4, warnLow: 25, warnHigh: 92, critLow: 12, critHigh: 97 }),
  def('northfield-wrrf', { id: 'GAS-H2S-01', nodeId: 'gasholder', parameter: 'h2s', label: 'H2S Content', unit: 'ppm', min: 0, max: 800, decimals: 0, base: 184, amp: 42, warnHigh: 400, critHigh: 600 }),

  // CHP
  def('northfield-wrrf', { id: 'CHP-PWR-01', nodeId: 'chp', parameter: 'power', label: 'Electrical Output', unit: 'kW', min: 0, max: 700, decimals: 0, base: 384, amp: 34, warnLow: 200, critLow: 120, pinned: true }),
  def('northfield-wrrf', { id: 'CHP-EFF-01', nodeId: 'chp', parameter: 'efficiency', label: 'CHP Efficiency', unit: '%', min: 0, max: 60, decimals: 1, base: 38.4, amp: 1.8, warnLow: 30, critLow: 25 }),
  def('northfield-wrrf', { id: 'CHP-THM-01', nodeId: 'chp', parameter: 'power', label: 'Thermal Output', unit: 'kW', min: 0, max: 900, decimals: 0, base: 462, amp: 38 }),

  // Dewatering
  def('northfield-wrrf', { id: 'DWT-SLD-01', nodeId: 'dewatering', parameter: 'solids', label: 'Cake Solids', unit: '%', min: 0, max: 40, decimals: 1, base: 22.4, amp: 1.6, warnLow: 17, critLow: 14, target: 24, pinned: true }),
  def('northfield-wrrf', { id: 'DWT-POL-01', nodeId: 'dewatering', parameter: 'dosing', label: 'Polymer Dose', unit: 'kg/t', min: 0, max: 20, decimals: 2, base: 6.24, amp: 0.72, warnHigh: 11, critHigh: 14 }),
  def('northfield-wrrf', { id: 'DWT-THR-01', nodeId: 'dewatering', parameter: 'flow', label: 'Throughput', unit: 'm3/h', min: 0, max: 60, decimals: 1, base: 18.6, amp: 2.4, pinned: true }),

  // Cake export
  def('northfield-wrrf', { id: 'CAK-MAS-01', nodeId: 'cake', parameter: 'mass', label: 'Biosolids Export', unit: 't/d', min: 0, max: 40, decimals: 2, base: 14.24, amp: 1.4, pinned: true }),
  def('northfield-wrrf', { id: 'CAK-LVL-01', nodeId: 'cake', parameter: 'level', label: 'Silo Level', unit: '%', min: 0, max: 100, decimals: 1, base: 48.2, amp: 12, warnHigh: 88, critHigh: 96 }),
];

/* ------------------------------------------------------------------ *
 * Eastbank industrial pre-treatment works.
 * ------------------------------------------------------------------ */

const EASTBANK: SensorDef[] = [
  def('eastbank-industrial', { id: 'EB-FLW-01', nodeId: 'influent', parameter: 'flow', label: 'Industrial Inflow', unit: 'm3/h', min: 0, max: 250, decimals: 0, base: 96, amp: 22, diurnal: true, warnHigh: 180, critHigh: 220, pinned: true }),
  def('eastbank-industrial', { id: 'EB-PH-01', nodeId: 'influent', parameter: 'ph', label: 'Raw pH', unit: 'pH', min: 2, max: 12, decimals: 2, base: 6.42, amp: 0.68, warnLow: 5.5, warnHigh: 9, critLow: 4.5, critHigh: 10.5, pinned: true }),
  def('eastbank-industrial', { id: 'EB-COD-01', nodeId: 'influent', parameter: 'cod', label: 'Raw COD', unit: 'mg/L', min: 0, max: 6000, decimals: 0, base: 2140, amp: 480, diurnal: true, warnHigh: 3600, critHigh: 4800, pinned: true }),
  def('eastbank-industrial', { id: 'EB-TSS-01', nodeId: 'influent', parameter: 'tss', label: 'Raw TSS', unit: 'mg/L', min: 0, max: 2000, decimals: 0, base: 620, amp: 140, warnHigh: 1200, critHigh: 1600 }),
  def('eastbank-industrial', { id: 'EB-TMP-01', nodeId: 'influent', parameter: 'temperature', label: 'Effluent Temp', unit: 'C', min: 0, max: 60, decimals: 1, base: 31.4, amp: 3.2, warnHigh: 42, critHigh: 48, pinned: true }),
  def('eastbank-industrial', { id: 'EB-CND-01', nodeId: 'influent', parameter: 'conductivity', label: 'Conductivity', unit: 'uS/cm', min: 0, max: 12000, decimals: 0, base: 4820, amp: 640, warnHigh: 8000, critHigh: 10000 }),
  def('eastbank-industrial', { id: 'EB-DOS-01', nodeId: 'preliminary', parameter: 'dosing', label: 'Neutraliser Dose', unit: 'L/h', min: 0, max: 200, decimals: 1, base: 62.4, amp: 14, pinned: true }),
  def('eastbank-industrial', { id: 'EB-DPR-01', nodeId: 'preliminary', parameter: 'dp', label: 'DAF Diff. Press', unit: 'bar', min: 0, max: 3, decimals: 2, base: 0.68, amp: 0.16, warnHigh: 1.4, critHigh: 2 }),
  def('eastbank-industrial', { id: 'EB-OIL-01', nodeId: 'preliminary', parameter: 'oil', label: 'Oil & Grease', unit: 'mg/L', min: 0, max: 300, decimals: 1, base: 42.6, amp: 12, warnHigh: 100, critHigh: 150, pinned: true }),
  def('eastbank-industrial', { id: 'EB-MET-01', nodeId: 'preliminary', parameter: 'metals', label: 'Heavy Metals Idx', unit: 'idx', min: 0, max: 100, decimals: 1, base: 24.2, amp: 6.4, warnHigh: 55, critHigh: 75 }),
  def('eastbank-industrial', { id: 'EB-OUT-01', nodeId: 'effluent', parameter: 'flow', label: 'Discharge Flow', unit: 'm3/h', min: 0, max: 250, decimals: 0, base: 92, amp: 20, diurnal: true }),
  def('eastbank-industrial', { id: 'EB-OCD-01', nodeId: 'effluent', parameter: 'cod', label: 'Discharge COD', unit: 'mg/L', min: 0, max: 1500, decimals: 0, base: 386, amp: 78, warnHigh: 700, critHigh: 1000, target: 500, pinned: true }),
];

/* ------------------------------------------------------------------ *
 * Highland Reservoir - receiving water, home of the bloom model.
 * ------------------------------------------------------------------ */

const HIGHLAND: SensorDef[] = [
  def('highland-reservoir', { id: 'HR-TMP-01', nodeId: 'reservoir', parameter: 'temperature', label: 'Surface Temp', unit: 'C', min: 0, max: 35, decimals: 1, base: 22.8, amp: 1.6, warnHigh: 26, critHigh: 29, pinned: true }),
  def('highland-reservoir', { id: 'HR-CHL-01', nodeId: 'reservoir', parameter: 'chlorophyll', label: 'Chlorophyll-a', unit: 'ug/L', min: 0, max: 200, decimals: 1, base: 42.6, amp: 12.4, warnHigh: 60, critHigh: 100, pinned: true }),
  def('highland-reservoir', { id: 'HR-PHY-01', nodeId: 'reservoir', parameter: 'phycocyanin', label: 'Phycocyanin', unit: 'ug/L', min: 0, max: 150, decimals: 1, base: 28.4, amp: 9.8, warnHigh: 45, critHigh: 80, pinned: true }),
  def('highland-reservoir', { id: 'HR-TRB-01', nodeId: 'reservoir', parameter: 'turbidity', label: 'Turbidity', unit: 'NTU', min: 0, max: 40, decimals: 2, base: 6.42, amp: 1.8, warnHigh: 12, critHigh: 20 }),
  def('highland-reservoir', { id: 'HR-DO-01', nodeId: 'reservoir', parameter: 'do', label: 'Dissolved Oxygen', unit: 'mg/L', min: 0, max: 16, decimals: 2, base: 7.42, amp: 1.4, warnLow: 5, critLow: 3, pinned: true }),
  def('highland-reservoir', { id: 'HR-PH-01', nodeId: 'reservoir', parameter: 'ph', label: 'Surface pH', unit: 'pH', min: 5, max: 11, decimals: 2, base: 8.24, amp: 0.32, warnHigh: 9, critHigh: 9.6 }),
  def('highland-reservoir', { id: 'HR-TN-01', nodeId: 'reservoir', parameter: 'tn', label: 'Total Nitrogen', unit: 'mg/L', min: 0, max: 10, decimals: 2, base: 1.84, amp: 0.34, warnHigh: 3, critHigh: 4.5, pinned: true }),
  def('highland-reservoir', { id: 'HR-TP-01', nodeId: 'reservoir', parameter: 'tp', label: 'Total Phosphorus', unit: 'mg/L', min: 0, max: 1, decimals: 3, base: 0.086, amp: 0.022, warnHigh: 0.15, critHigh: 0.25, pinned: true }),
  def('highland-reservoir', { id: 'HR-SDD-01', nodeId: 'reservoir', parameter: 'secchi', label: 'Secchi Depth', unit: 'm', min: 0, max: 8, decimals: 2, base: 1.84, amp: 0.36, warnLow: 1.2, critLow: 0.7 }),
  def('highland-reservoir', { id: 'HR-LVL-01', nodeId: 'reservoir', parameter: 'level', label: 'Reservoir Level', unit: '%', min: 0, max: 100, decimals: 1, base: 78.4, amp: 3.2, warnLow: 45, critLow: 30 }),
];

export const SENSORS: SensorDef[] = [...NORTHFIELD, ...EASTBANK, ...HIGHLAND];

const BY_ID = new Map(SENSORS.map((s) => [s.id, s]));

export function getSensor(id: string): SensorDef | undefined {
  return BY_ID.get(id);
}

/** Register cloned / runtime instruments so getSensor stays the single lookup. */
export function registerSensors(defs: SensorDef[]) {
  for (const def of defs) {
    BY_ID.set(def.id, def);
  }
}

export function sensorsForFacility(facilityId: FacilityId): SensorDef[] {
  return [...BY_ID.values()].filter((s) => s.facilityId === facilityId);
}

export function sensorsForNode(facilityId: FacilityId, nodeId: string): SensorDef[] {
  return [...BY_ID.values()].filter((s) => s.facilityId === facilityId && s.nodeId === nodeId);
}

export function cloneSensors(templateFacilityId: FacilityId, newFacilityId: FacilityId): SensorDef[] {
  return SENSORS.filter((s) => s.facilityId === templateFacilityId).map((s) => ({
    ...s,
    id: `${newFacilityId}__${s.id}`,
    facilityId: newFacilityId,
  }));
}

import type { PlantNode, PlantPipe } from './types';

/**
 * The plant is authored once in "plant units" on a fixed sheet. The 3D scene and
 * the DOM overlay both derive from these coordinates, which is what keeps sensor
 * tags welded to their equipment at any camera zoom.
 */
export const PLANT_WIDTH = 2400;
export const PLANT_HEIGHT = 1200;

/** Plant units per world unit in the Three.js scene. */
export const PLANT_UNITS_PER_WORLD = 100;

/** Convert a plant-unit coordinate to scene-space (x, z), centred on the origin. */
export function toWorld(x: number, y: number): [number, number] {
  return [
    (x - PLANT_WIDTH / 2) / PLANT_UNITS_PER_WORLD,
    (y - PLANT_HEIGHT / 2) / PLANT_UNITS_PER_WORLD,
  ];
}

/** Water colour ramp from raw sewage through to polished final effluent. */
export const WATER_RAMP = [
  '#33291d',
  '#4a3f2a',
  '#5c5a3f',
  '#5f7a6a',
  '#5f9aa1',
  '#3fb2c4',
  '#7fd4e2',
  '#bde9f4',
] as const;

/** Sample the ramp at a treatment progress of 0..1. */
export function waterColorAt(stage: number): string {
  const t = Math.min(1, Math.max(0, stage)) * (WATER_RAMP.length - 1);
  return WATER_RAMP[Math.round(t)];
}

const LIQUID_Y = 360;
const SLUDGE_Y = 900;

export const PLANT_NODES: PlantNode[] = [
  {
    id: 'influent',
    label: 'Influent Works',
    sub: 'Raw inflow',
    kind: 'intake',
    pathway: 'liquid',
    x: 160,
    y: LIQUID_Y,
    w: 190,
    h: 140,
    stage: 0,
    group: 'preliminary',
  },
  {
    id: 'preliminary',
    label: 'Preliminary',
    sub: 'Screening & grit',
    kind: 'screening',
    pathway: 'liquid',
    x: 450,
    y: LIQUID_Y,
    w: 190,
    h: 130,
    stage: 0.08,
    group: 'preliminary',
  },
  {
    id: 'primary',
    label: 'Primary Clarifier',
    sub: 'Sedimentation',
    kind: 'clarifier',
    pathway: 'liquid',
    x: 760,
    y: LIQUID_Y,
    w: 220,
    h: 220,
    stage: 0.24,
    group: 'primary',
  },
  {
    id: 'bioreactor',
    label: 'Biological Reactor',
    sub: 'Activated sludge',
    kind: 'aeration',
    pathway: 'liquid',
    x: 1090,
    y: LIQUID_Y,
    w: 280,
    h: 180,
    stage: 0.44,
    group: 'secondary',
  },
  {
    id: 'secondary',
    label: 'Secondary Clarifier',
    sub: 'Solids separation',
    kind: 'clarifier',
    pathway: 'liquid',
    x: 1420,
    y: LIQUID_Y,
    w: 220,
    h: 220,
    stage: 0.62,
    group: 'secondary',
  },
  {
    id: 'nutrient',
    label: 'Nutrient Removal',
    sub: 'N & P polishing',
    kind: 'reactor',
    pathway: 'liquid',
    x: 1710,
    y: LIQUID_Y,
    w: 200,
    h: 160,
    stage: 0.74,
    group: 'advanced',
  },
  {
    id: 'filtration',
    label: 'Advanced Filtration',
    sub: 'Membrane / media',
    kind: 'filter',
    pathway: 'liquid',
    x: 1970,
    y: LIQUID_Y,
    w: 190,
    h: 150,
    stage: 0.86,
    group: 'advanced',
  },
  {
    id: 'uv',
    label: 'UV Disinfection',
    sub: 'Pathogen kill',
    kind: 'uv',
    pathway: 'liquid',
    x: 2200,
    y: LIQUID_Y,
    w: 170,
    h: 130,
    stage: 0.95,
    group: 'advanced',
  },
  {
    id: 'effluent',
    label: 'Final Effluent',
    sub: 'Outfall & reuse',
    kind: 'outfall',
    pathway: 'liquid',
    x: 2210,
    y: 640,
    w: 180,
    h: 130,
    stage: 1,
    group: 'advanced',
  },

  {
    id: 'thickener',
    label: 'Sludge Thickener',
    sub: 'Gravity thickening',
    kind: 'thickener',
    pathway: 'sludge',
    x: 760,
    y: SLUDGE_Y,
    w: 200,
    h: 200,
    stage: 0.1,
    group: 'solids',
  },
  {
    id: 'digester',
    label: 'Anaerobic Digester',
    sub: 'Mesophilic 37C',
    kind: 'digester',
    pathway: 'sludge',
    x: 1090,
    y: SLUDGE_Y,
    w: 220,
    h: 220,
    stage: 0.2,
    group: 'solids',
  },
  {
    id: 'gasholder',
    label: 'Biogas Storage',
    sub: 'Membrane holder',
    kind: 'gasholder',
    pathway: 'gas',
    x: 1420,
    y: SLUDGE_Y,
    w: 190,
    h: 190,
    stage: 0.3,
    group: 'solids',
  },
  {
    id: 'chp',
    label: 'CHP Cogeneration',
    sub: 'Energy recovery',
    kind: 'chp',
    pathway: 'gas',
    x: 1710,
    y: SLUDGE_Y,
    w: 200,
    h: 150,
    stage: 0.4,
    group: 'solids',
  },
  {
    id: 'dewatering',
    label: 'Dewatering',
    sub: 'Centrifuge',
    kind: 'dewatering',
    pathway: 'sludge',
    x: 1970,
    y: SLUDGE_Y,
    w: 190,
    h: 150,
    stage: 0.5,
    group: 'solids',
  },
  {
    id: 'cake',
    label: 'Dried Cake',
    sub: 'Biosolids export',
    kind: 'silo',
    pathway: 'sludge',
    x: 2210,
    y: SLUDGE_Y,
    w: 170,
    h: 130,
    stage: 0.6,
    group: 'solids',
  },
];

export const PLANT_PIPES: PlantPipe[] = [
  {
    id: 'p-inf-pre',
    from: 'influent',
    to: 'preliminary',
    pathway: 'liquid',
    flowSensorId: 'INF-FLW-01',
  },
  { id: 'p-pre-prc', from: 'preliminary', to: 'primary', pathway: 'liquid', flowSensorId: 'INF-FLW-01' },
  { id: 'p-prc-bio', from: 'primary', to: 'bioreactor', pathway: 'liquid', flowSensorId: 'INF-FLW-01' },
  { id: 'p-bio-sec', from: 'bioreactor', to: 'secondary', pathway: 'liquid', flowSensorId: 'INF-FLW-01' },
  { id: 'p-sec-nut', from: 'secondary', to: 'nutrient', pathway: 'liquid', flowSensorId: 'EFF-FLW-01' },
  { id: 'p-nut-fil', from: 'nutrient', to: 'filtration', pathway: 'liquid', flowSensorId: 'EFF-FLW-01' },
  { id: 'p-fil-uv', from: 'filtration', to: 'uv', pathway: 'liquid', flowSensorId: 'EFF-FLW-01' },
  {
    id: 'p-uv-eff',
    from: 'uv',
    to: 'effluent',
    pathway: 'liquid',
    waypoints: [[2295, 360], [2295, 640]],
    flowSensorId: 'EFF-FLW-01',
  },

  {
    id: 'p-sec-bio-ras',
    from: 'secondary',
    to: 'bioreactor',
    pathway: 'recycle',
    waypoints: [[1420, 580], [1090, 580]],
    flowSensorId: 'SEC-RAS-01',
  },

  { id: 'p-prc-thk', from: 'primary', to: 'thickener', pathway: 'sludge', flowSensorId: 'THK-FLW-01' },
  {
    id: 'p-sec-thk',
    from: 'secondary',
    to: 'thickener',
    pathway: 'sludge',
    waypoints: [[1420, 720], [760, 720]],
    flowSensorId: 'THK-FLW-01',
  },
  { id: 'p-thk-dig', from: 'thickener', to: 'digester', pathway: 'sludge', flowSensorId: 'THK-FLW-01' },
  { id: 'p-dig-gas', from: 'digester', to: 'gasholder', pathway: 'gas', flowSensorId: 'GAS-FLW-01' },
  { id: 'p-gas-chp', from: 'gasholder', to: 'chp', pathway: 'gas', flowSensorId: 'GAS-FLW-01' },
  {
    id: 'p-dig-dwt',
    from: 'digester',
    to: 'dewatering',
    pathway: 'sludge',
    waypoints: [[1090, 1090], [1970, 1090]],
    flowSensorId: 'DWT-THR-01',
  },
  { id: 'p-dwt-cake', from: 'dewatering', to: 'cake', pathway: 'sludge', flowSensorId: 'DWT-THR-01' },
];

const NODE_INDEX = new Map(PLANT_NODES.map((n) => [n.id, n]));

export function getNode(id: string): PlantNode {
  const node = NODE_INDEX.get(id);
  if (!node) throw new Error(`Unknown plant node: ${id}`);
  return node;
}

/** Full point list for a pipe, in plant units, including both endpoints. */
export function pipePoints(pipe: PlantPipe): Array<[number, number]> {
  const from = getNode(pipe.from);
  const to = getNode(pipe.to);
  return [
    [from.x, from.y],
    ...(pipe.waypoints ?? []),
    [to.x, to.y],
  ];
}

export const PROCESS_GROUPS = [
  { id: 'preliminary', label: 'Preliminary', nodes: ['influent', 'preliminary'] },
  { id: 'primary', label: 'Primary', nodes: ['primary'] },
  { id: 'secondary', label: 'Secondary', nodes: ['bioreactor', 'secondary'] },
  { id: 'advanced', label: 'Advanced', nodes: ['nutrient', 'filtration', 'uv', 'effluent'] },
  {
    id: 'solids',
    label: 'Solids & Gas',
    nodes: ['thickener', 'digester', 'gasholder', 'chp', 'dewatering', 'cake'],
  },
] as const;

import type { Facility, FacilityId, FacilityKind } from './types';

export const FACILITIES: Facility[] = [
  {
    id: 'northfield-wrrf',
    name: 'Northfield Water Resource Recovery Facility',
    shortName: 'Northfield WRRF',
    code: 'NF-01',
    kind: 'wrrf',
    hasFullTwin: true,
    designFlow: 480,
    population: 184000,
    commissioned: 1998,
  },
  {
    id: 'eastbank-industrial',
    name: 'Eastbank Industrial Pre-Treatment Works',
    shortName: 'Eastbank Industrial',
    code: 'EB-04',
    kind: 'pretreatment',
    hasFullTwin: false,
    designFlow: 120,
    population: 0,
    commissioned: 2011,
  },
  {
    id: 'highland-reservoir',
    name: 'Highland Reservoir Receiving Water',
    shortName: 'Highland Reservoir',
    code: 'HR-09',
    kind: 'reservoir',
    hasFullTwin: false,
    designFlow: 0,
    population: 0,
    commissioned: 1974,
  },
];

export const DEFAULT_FACILITY: FacilityId = 'northfield-wrrf';

export function getFacility(id: FacilityId, catalog: Facility[] = FACILITIES): Facility {
  const found = catalog.find((f) => f.id === id);
  if (found) return found;
  return {
    id,
    name: id,
    shortName: id,
    code: id.slice(0, 8).toUpperCase(),
    kind: 'wrrf',
    hasFullTwin: false,
    designFlow: 0,
    population: 0,
    commissioned: 0,
  };
}

export function isFacilityId(value: string): value is FacilityId {
  return typeof value === 'string' && value.trim().length > 0 && value.length < 80;
}

export const TEMPLATE_BY_KIND: Record<FacilityKind, FacilityId> = {
  wrrf: 'northfield-wrrf',
  pretreatment: 'eastbank-industrial',
  reservoir: 'highland-reservoir',
};

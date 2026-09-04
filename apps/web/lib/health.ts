import {
  PROCESS_GROUPS,
  sensorsForFacility,
  worstSeverity,
  type FacilityId,
  type Severity,
} from '@aquasense/shared';
import { getSeverity } from './channels';

/** Dominant state across every instrument attached to a plant node. */
export function nodeSeverity(facilityId: FacilityId, nodeId: string): Severity {
  const list = sensorsForFacility(facilityId)
    .filter((s) => s.nodeId === nodeId)
    .map((s) => getSeverity(s.id));
  return list.length ? worstSeverity(list) : 'nominal';
}

export function nodeFlaggedCount(facilityId: FacilityId, nodeId: string): number {
  return sensorsForFacility(facilityId)
    .filter((s) => s.nodeId === nodeId)
    .filter((s) => {
      const sev = getSeverity(s.id);
      return sev === 'warning' || sev === 'critical';
    }).length;
}

export interface GroupHealth {
  id: string;
  label: string;
  severity: Severity;
  flagged: number;
  total: number;
}

/** Stage groups for the spine and Treatment tabs — facility-aware, not WRRF-only. */
export function groupsForFacility(facilityId: FacilityId): Array<{
  id: string;
  label: string;
  nodes: string[];
}> {
  const sensors = sensorsForFacility(facilityId);
  if (sensors.some((s) => s.nodeId === 'bioreactor') || facilityId === 'northfield-wrrf') {
    return PROCESS_GROUPS.map((g) => ({ id: g.id, label: g.label, nodes: [...g.nodes] }));
  }
  if (sensors.some((s) => s.nodeId === 'reservoir') || facilityId === 'highland-reservoir') {
    return [{ id: 'reservoir', label: 'Receiving Water', nodes: ['reservoir'] }];
  }
  return [
    { id: 'intake', label: 'Intake', nodes: ['influent'] },
    { id: 'pretreat', label: 'Pre-Treat', nodes: ['preliminary'] },
    { id: 'discharge', label: 'Discharge', nodes: ['effluent'] },
  ];
}

export function processGroupHealth(facilityId: FacilityId): GroupHealth[] {
  const sensors = sensorsForFacility(facilityId);

  return groupsForFacility(facilityId).map((group) => {
    const owned = sensors.filter((s) => group.nodes.includes(s.nodeId));
    const severities = owned.map((s) => getSeverity(s.id));
    return {
      id: group.id,
      label: group.label,
      severity: severities.length ? worstSeverity(severities) : 'offline',
      flagged: severities.filter((s) => s === 'warning' || s === 'critical').length,
      total: owned.length,
    };
  });
}

export function facilityCounts(facilityId: FacilityId) {
  const sensors = sensorsForFacility(facilityId);
  let warning = 0;
  let critical = 0;

  for (const sensor of sensors) {
    const sev = getSeverity(sensor.id);
    if (sev === 'warning') warning += 1;
    else if (sev === 'critical') critical += 1;
  }

  return { total: sensors.length, warning, critical, nominal: sensors.length - warning - critical };
}

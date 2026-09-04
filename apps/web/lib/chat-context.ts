import {
  getFacility,
  sensorsForFacility,
  type Alert,
  type Facility,
  type Severity,
} from '@aquasense/shared';
import { getSeverity, getValue } from '@/lib/channels';
import { facilityCounts } from '@/lib/health';
import { useAuth } from '@/stores/useAuth';
import { useConsole } from '@/stores/useConsole';

export interface ChatSensorRow {
  id: string;
  name: string;
  parameter: string;
  unit: string;
  value: number;
  severity: Severity;
  nodeId: string;
  pinned?: boolean;
}

export interface ChatSnapshot {
  plant: {
    id: string;
    name: string;
    shortName: string;
    code: string;
    kind: string;
  };
  plants: Array<{ id: string; shortName: string; kind: string }>;
  counts: { total: number; warning: number; critical: number; nominal: number };
  sensors: ChatSensorRow[];
  alerts: Array<{ code: string; message: string; severity: Severity; state: string }>;
}

export function buildChatSnapshot(): ChatSnapshot {
  const facilityId = useConsole.getState().facilityId;
  const plants = useAuth.getState().plants;
  const alerts = useConsole.getState().alerts;
  const plant = getFacility(facilityId, plants) as Facility;
  const sensors = sensorsForFacility(facilityId);
  const flagged = sensors
    .map((sensor) => ({
      id: sensor.id,
      name: sensor.label,
      parameter: sensor.parameter,
      unit: sensor.unit,
      value: getValue(sensor.id),
      severity: getSeverity(sensor.id),
      nodeId: sensor.nodeId,
      pinned: sensor.pinned,
    }))
    .filter((row) => row.severity === 'warning' || row.severity === 'critical' || row.pinned)
    .slice(0, 24);

  return {
    plant: {
      id: plant.id,
      name: plant.name,
      shortName: plant.shortName,
      code: plant.code,
      kind: plant.kind,
    },
    plants: plants.map((p) => ({ id: p.id, shortName: p.shortName, kind: p.kind })),
    counts: facilityCounts(facilityId),
    sensors: flagged,
    alerts: (alerts as Alert[])
      .filter((a) => a.state === 'ACTIVE')
      .slice(0, 12)
      .map((a) => ({
        code: a.code,
        message: a.message,
        severity: a.severity,
        state: a.state,
      })),
  };
}

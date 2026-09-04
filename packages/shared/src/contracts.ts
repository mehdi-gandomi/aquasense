import type {
  Alert,
  EquipmentDef,
  EventLogEntry,
  FacilityId,
  SensorReading,
  StreamMode,
} from './types';

export const WS_NAMESPACE = '/live';

export function facilityRoom(facilityId: FacilityId): string {
  return `facility:${facilityId}`;
}

/** Server -> client events. */
export interface ServerEvents {
  'telemetry:batch': (payload: TelemetryBatch) => void;
  'plant:state': (payload: PlantStateSnapshot) => void;
  'alert:new': (payload: Alert) => void;
  'alert:updated': (payload: Alert) => void;
  'event:log': (payload: EventLogEntry) => void;
  'stream:mode': (payload: StreamModePayload) => void;
}

/** Client -> server events. */
export interface ClientEvents {
  subscribe: (payload: { facilityId: FacilityId }) => void;
  unsubscribe: (payload: { facilityId: FacilityId }) => void;
}

export interface TelemetryBatch {
  facilityId: FacilityId;
  sentAt: number;
  readings: SensorReading[];
}

export interface PlantStateSnapshot {
  facilityId: FacilityId;
  equipment: EquipmentDef[];
  updatedAt: number;
}

export interface StreamModePayload {
  facilityId: FacilityId;
  mode: StreamMode;
  since: number;
}

export type EquipmentCommand =
  | { command: 'start' }
  | { command: 'stop' }
  | { command: 'setpoint'; value: number }
  | { command: 'mode'; value: 'AUTO' | 'MANUAL' | 'LOCKOUT' };

/** MQTT topic helpers. Broker ingestion arrives in a later phase. */
export const mqttTopics = {
  telemetry(facilityId: FacilityId, nodeId: string, sensorId: string) {
    return `aquasense/${facilityId}/${nodeId}/${sensorId}/telemetry`;
  },
  telemetryWildcard() {
    return 'aquasense/+/+/+/telemetry';
  },
  command(facilityId: FacilityId, equipmentId: string) {
    return `aquasense/${facilityId}/equipment/${equipmentId}/cmd`;
  },
};

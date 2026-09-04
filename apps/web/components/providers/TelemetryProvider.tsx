'use client';

import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  DEFAULT_FACILITY,
  WS_NAMESPACE,
  getSensor,
  roundTo,
  sensorsForFacility,
  severityFor,
  simulateValue,
  type Alert,
  type EquipmentDef,
  type EventLogEntry,
  type PlantStateSnapshot,
  type SensorReading,
  type SimulationInfluence,
  type StreamModePayload,
  type TelemetryBatch,
} from '@aquasense/shared';
import { ingest, primeChannels } from '@/lib/channels';
import { useConsole } from '@/stores/useConsole';
import { useAuth } from '@/stores/useAuth';
import { authHeaders } from '@/lib/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';
const CONNECT_GRACE_MS = 2500;
const LOCAL_TICK_MS = 250;
const RENDER_TICK_MS = 250;

/**
 * Owns the single live connection for the console.
 *
 * The console must never look dead. If the SCADA core is unreachable we run the
 * same deterministic simulation locally, so the operator sees a coherent plant
 * either way and the header badge tells them which reality they are looking at.
 */
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const facilityId = useConsole((s) => s.facilityId);
  const token = useAuth((s) => s.token);

  useEffect(() => {
    primeChannels();

    const store = useConsole.getState();
    store.setConnection('connecting');

    let socket: Socket | null = null;
    let localTimer: ReturnType<typeof setInterval> | null = null;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const startLocalSimulation = () => {
      if (localTimer || disposed) return;
      useConsole.getState().setConnection('local');
      useConsole.getState().setStreamMode('LOCAL');

      const sensors = sensorsForFacility(facilityId);
      const lastSeverity = new Map<string, SensorReading['severity']>();
      localTimer = setInterval(() => {
        const now = Date.now();
        const influence = influenceFromEquipment(useConsole.getState().equipment);
        const readings: SensorReading[] = sensors.map((sensor) => {
          const value = roundTo(simulateValue(sensor, now, influence), sensor.decimals);
          return {
            facilityId: sensor.facilityId,
            sensorId: sensor.id,
            nodeId: sensor.nodeId,
            value,
            unit: sensor.unit,
            severity: severityFor(sensor, value),
            recordedAt: now,
          };
        });
        ingest(readings);

        for (const reading of readings) {
          const prev = lastSeverity.get(reading.sensorId);
          lastSeverity.set(reading.sensorId, reading.severity);
          if (prev === reading.severity) continue;
          if (reading.severity === 'warning' || reading.severity === 'critical') {
            const sensor = getSensor(reading.sensorId);
            useConsole.getState().pushAlert({
              id: `loc-${reading.sensorId}`,
              facilityId,
              sensorId: reading.sensorId,
              nodeId: reading.nodeId,
              severity: reading.severity,
              code: reading.severity === 'critical' ? 'CRIT-THR' : 'WARN-THR',
              message: `${sensor?.label ?? reading.sensorId} ${reading.value} ${reading.unit} — threshold breach`,
              value: reading.value,
              raisedAt: now,
              state: 'ACTIVE',
            });
            useConsole.getState().pushEvent({
              id: `evt-${now}-${reading.sensorId}`,
              facilityId,
              level: reading.severity === 'critical' ? 'CRIT' : 'WARN',
              source: reading.sensorId,
              message: `${sensor?.label ?? reading.sensorId} left nominal band`,
              at: now,
            });
          }
        }
      }, LOCAL_TICK_MS);
    };

    const stopLocalSimulation = () => {
      if (localTimer) {
        clearInterval(localTimer);
        localTimer = null;
      }
    };

    try {
      socket = io(`${WS_URL}${WS_NAMESPACE}`, {
        transports: ['websocket', 'polling'],
        reconnectionDelay: 1500,
        reconnectionDelayMax: 6000,
        timeout: 4000,
        auth: { token: token ?? localStorage.getItem('aquasense.token') },
      });

      socket.on('connect', () => {
        stopLocalSimulation();
        useConsole.getState().setConnection('socket');
        socket?.emit('subscribe', { facilityId });
      });

      socket.on('disconnect', () => {
        if (!disposed) startLocalSimulation();
      });

      socket.on('connect_error', () => {
        if (!disposed) startLocalSimulation();
      });

      socket.on('telemetry:batch', (batch: TelemetryBatch) => {
        if (batch.facilityId !== facilityId) return;
        ingest(batch.readings);
      });

      socket.on('stream:mode', (payload: StreamModePayload) => {
        if (payload.facilityId !== facilityId) return;
        useConsole.getState().setStreamMode(payload.mode);
      });

      socket.on('plant:state', (payload: PlantStateSnapshot) => {
        if (payload.facilityId !== facilityId) return;
        useConsole.getState().setEquipment(payload.equipment);
      });

      socket.on('alert:new', (alert: Alert) => {
        if (alert.facilityId !== facilityId) return;
        useConsole.getState().pushAlert(alert);
      });

      socket.on('alert:updated', (alert: Alert) => {
        if (alert.facilityId !== facilityId) return;
        useConsole.getState().upsertAlert(alert);
      });

      socket.on('event:log', (entry: EventLogEntry) => {
        if (entry.facilityId !== facilityId) return;
        useConsole.getState().pushEvent(entry);
      });
    } catch {
      startLocalSimulation();
    }

    // If the core has not answered by now, assume it is not running.
    graceTimer = setTimeout(() => {
      if (useConsole.getState().connection !== 'socket') startLocalSimulation();
    }, CONNECT_GRACE_MS);

    // Single throttled re-render pulse for every DOM readout in the console.
    const renderTimer = setInterval(() => useConsole.getState().bump(), RENDER_TICK_MS);

    return () => {
      disposed = true;
      if (graceTimer) clearTimeout(graceTimer);
      clearInterval(renderTimer);
      stopLocalSimulation();
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [facilityId, token]);

  return <>{children}</>;
}

export async function sendEquipmentCommand(
  equipmentId: string,
  body: Record<string, unknown>,
) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  try {
    const res = await fetch(`${base}/plant/equipment/${equipmentId}/command`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    // Offline: the caller applies an optimistic local update instead.
    return null;
  }
}

function influenceFromEquipment(equipment: EquipmentDef[]): SimulationInfluence {
  const avg = (kinds: EquipmentDef['kind'][], nominal: number) => {
    const items = equipment.filter((e) => kinds.includes(e.kind));
    if (!items.length) return 1;
    const active = items.filter((e) => e.running && e.mode !== 'LOCKOUT');
    if (!active.length) return 0.35;
    const mean =
      active.reduce((acc, e) => acc + e.setpoint / (e.setpointMax || 1), 0) / active.length;
    return Math.max(0.3, Math.min(1.8, mean / (nominal / 100)));
  };
  return {
    aeration: avg(['blower'], 70),
    hydraulic: avg(['pump'], 64),
    dosing: avg(['dosing'], 30),
  };
}

export async function sendAlertAction(alertId: string, action: 'ack' | 'resolve') {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  try {
    const res = await fetch(`${base}/alerts/${encodeURIComponent(alertId)}/${action}`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export { DEFAULT_FACILITY };

'use client';

import { create } from 'zustand';
import {
  DEFAULT_FACILITY,
  equipmentForFacility,
  type Alert,
  type EquipmentDef,
  type EventLogEntry,
  type FacilityId,
  type StreamMode,
} from '@aquasense/shared';

export type SelectionKind = 'node' | 'sensor' | 'equipment' | 'alert';

export interface Selection {
  kind: SelectionKind;
  id: string;
}

export type ConnectionState = 'connecting' | 'socket' | 'local';

const MAX_EVENTS = 120;

interface ConsoleState {
  facilityId: FacilityId;
  connection: ConnectionState;
  streamMode: StreamMode;
  /** Bumped on a throttled cadence to re-render DOM readouts. */
  tick: number;

  equipment: EquipmentDef[];
  alerts: Alert[];
  events: EventLogEntry[];

  selection: Selection | null;
  spineExpanded: boolean;
  deckOpen: boolean;

  /** Scrubber: null means live, otherwise ms offset into the past. */
  replayOffset: number | null;

  setFacility: (id: FacilityId) => void;
  setConnection: (state: ConnectionState) => void;
  setStreamMode: (mode: StreamMode) => void;
  bump: () => void;

  setEquipment: (equipment: EquipmentDef[]) => void;
  patchEquipment: (item: EquipmentDef) => void;
  pushAlert: (alert: Alert) => void;
  upsertAlert: (alert: Alert) => void;
  clearAlert: (id: string) => void;
  ackAlert: (id: string) => void;
  resolveAlert: (id: string) => void;
  pushEvent: (entry: EventLogEntry) => void;

  select: (selection: Selection | null) => void;
  toggleSpine: () => void;
  toggleDeck: () => void;
  setReplayOffset: (offset: number | null) => void;
}

export const useConsole = create<ConsoleState>((set) => ({
  facilityId: DEFAULT_FACILITY,
  connection: 'connecting',
  streamMode: 'SIMULATED',
  tick: 0,

  equipment: equipmentForFacility(DEFAULT_FACILITY),
  alerts: [],
  events: [],

  selection: null,
  spineExpanded: true,
  deckOpen: true,
  replayOffset: null,

  setFacility: (facilityId) =>
    set({
      facilityId,
      equipment: equipmentForFacility(facilityId),
      alerts: [],
      events: [],
      selection: null,
    }),

  setConnection: (connection) => set({ connection }),
  setStreamMode: (streamMode) => set({ streamMode }),
  bump: () => set((s) => ({ tick: s.tick + 1 })),

  setEquipment: (equipment) => set({ equipment }),
  patchEquipment: (item) =>
    set((s) => ({
      equipment: s.equipment.map((e) => (e.id === item.id ? item : e)),
    })),

  pushAlert: (alert) =>
    set((s) =>
      s.alerts.some((a) => a.id === alert.id || (a.sensorId === alert.sensorId && a.state === 'ACTIVE'))
        ? s
        : { alerts: [alert, ...s.alerts].slice(0, 60) },
    ),

  upsertAlert: (alert) =>
    set((s) => {
      const idx = s.alerts.findIndex((a) => a.id === alert.id);
      if (idx === -1) return { alerts: [alert, ...s.alerts].slice(0, 60) };
      const next = [...s.alerts];
      next[idx] = alert;
      return { alerts: next };
    }),

  clearAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

  ackAlert: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id && a.state === 'ACTIVE' ? { ...a, state: 'ACKED' } : a)),
    })),

  resolveAlert: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id && a.state !== 'RESOLVED' ? { ...a, state: 'RESOLVED' } : a)),
    })),

  pushEvent: (entry) =>
    set((s) => ({ events: [entry, ...s.events].slice(0, MAX_EVENTS) })),

  select: (selection) =>
    set((s) => ({ selection, deckOpen: selection ? true : s.deckOpen })),
  toggleSpine: () => set((s) => ({ spineExpanded: !s.spineExpanded })),
  toggleDeck: () => set((s) => ({ deckOpen: !s.deckOpen })),
  setReplayOffset: (replayOffset) => set({ replayOffset }),
}));

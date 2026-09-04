import { Injectable, NotFoundException } from '@nestjs/common';
import { Subject } from 'rxjs';
import {
  EQUIPMENT,
  equipmentForFacility,
  type EquipmentCommand,
  type EquipmentDef,
  type EventLogEntry,
  type FacilityId,
  type PlantStateSnapshot,
  type SimulationInfluence,
} from '@aquasense/shared';
import { HistoryService } from '../history/history.service';

/**
 * Authoritative equipment state. Operator commands mutate this registry and the
 * resulting influence factors are fed back into the simulation, so an override
 * visibly moves downstream readings rather than just flipping a badge.
 */
@Injectable()
export class PlantService {
  private readonly equipment: EquipmentDef[] = EQUIPMENT.map((e) => ({ ...e }));

  readonly stateChanged = new Subject<PlantStateSnapshot>();
  readonly events = new Subject<EventLogEntry>();
  readonly commands = new Subject<{
    facilityId: FacilityId;
    equipmentId: string;
    body: EquipmentCommand;
  }>();

  constructor(private readonly history: HistoryService) {}

  adoptFacility(facilityId: FacilityId) {
    for (const def of equipmentForFacility(facilityId)) {
      if (!this.equipment.some((e) => e.id === def.id)) {
        this.equipment.push({ ...def });
      }
    }
  }

  snapshot(facilityId: FacilityId): PlantStateSnapshot {
    return {
      facilityId,
      equipment: this.equipment.filter((e) => e.facilityId === facilityId),
      updatedAt: Date.now(),
    };
  }

  /**
   * Aggregate equipment posture into multipliers the simulation applies to
   * aeration, hydraulic and dosing linked parameters.
   */
  influence(facilityId: FacilityId): SimulationInfluence {
    const own = this.equipment.filter((e) => e.facilityId === facilityId);

    const avg = (kinds: EquipmentDef['kind'][], nominal: number) => {
      const items = own.filter((e) => kinds.includes(e.kind));
      if (!items.length) return 1;
      const active = items.filter((e) => e.running && e.mode !== 'LOCKOUT');
      if (!active.length) return 0.35;
      const mean =
        active.reduce((acc, e) => acc + e.setpoint / (e.setpointMax || 1), 0) / active.length;
      const nominalFraction = nominal / 100;
      return Math.max(0.3, Math.min(1.8, mean / nominalFraction));
    };

    return {
      aeration: avg(['blower'], 70),
      hydraulic: avg(['pump'], 64),
      dosing: avg(['dosing'], 30),
    };
  }

  get(equipmentId: string): EquipmentDef | undefined {
    return this.equipment.find((e) => e.id === equipmentId);
  }

  execute(equipmentId: string, cmd: EquipmentCommand): EquipmentDef {
    const item = this.equipment.find((e) => e.id === equipmentId);
    if (!item) throw new NotFoundException(`Unknown equipment: ${equipmentId}`);

    if (item.mode === 'LOCKOUT' && cmd.command !== 'mode') {
      throw new NotFoundException(`${equipmentId} is in LOCKOUT and rejects commands`);
    }

    switch (cmd.command) {
      case 'start':
        item.running = true;
        if (item.setpoint === 0) item.setpoint = Math.round(item.setpointMax * 0.6);
        break;
      case 'stop':
        item.running = false;
        break;
      case 'setpoint':
        item.setpoint = Math.min(item.setpointMax, Math.max(item.setpointMin, cmd.value));
        break;
      case 'mode':
        item.mode = cmd.value;
        if (cmd.value === 'LOCKOUT') item.running = false;
        break;
    }

    this.emitEvent(item.facilityId, {
      level: cmd.command === 'mode' ? 'WARN' : 'AUTO',
      source: item.id,
      message: this.describe(item, cmd),
    });

    this.stateChanged.next(this.snapshot(item.facilityId));
    this.commands.next({ facilityId: item.facilityId, equipmentId: item.id, body: cmd });
    return item;
  }

  emitEvent(facilityId: FacilityId, entry: Omit<EventLogEntry, 'id' | 'at' | 'facilityId'>) {
    const full: EventLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      facilityId,
      at: Date.now(),
    };
    this.events.next(full);
    void this.history.persistEvent(full);
  }

  private describe(item: EquipmentDef, cmd: EquipmentCommand): string {
    switch (cmd.command) {
      case 'start':
        return `${item.label} engaged by operator`;
      case 'stop':
        return `${item.label} stopped by operator`;
      case 'setpoint':
        return `${item.label} setpoint set to ${item.setpoint}${item.setpointUnit}`;
      case 'mode':
        return `${item.label} switched to ${cmd.value}`;
    }
  }
}

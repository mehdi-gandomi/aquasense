import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('equipment_events')
@Index('idx_event_facility_at', ['facilityId', 'at'])
export class EquipmentEventEntity {
  @PrimaryColumn({ length: 80 })
  id: string;

  @Column({ length: 48 })
  facilityId: string;

  @Column({ length: 8 })
  level: string;

  @Column({ length: 48 })
  source: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'bigint' })
  at: string;
}

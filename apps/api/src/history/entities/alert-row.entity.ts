import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('alerts')
@Index('idx_alert_facility_state', ['facilityId', 'state'])
export class AlertRowEntity {
  @PrimaryColumn({ length: 80 })
  id: string;

  @Column({ length: 48 })
  facilityId: string;

  @Column({ type: 'varchar', length: 48, nullable: true })
  sensorId: string | null;

  @Column({ type: 'varchar', length: 48, nullable: true })
  equipmentId: string | null;

  @Column({ type: 'varchar', length: 48, nullable: true })
  nodeId: string | null;

  @Column({ length: 16 })
  severity: string;

  @Column({ length: 32 })
  code: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'double', nullable: true })
  value: number | null;

  @Column({ type: 'bigint' })
  raisedAt: string;

  @Column({ length: 16 })
  state: string;
}

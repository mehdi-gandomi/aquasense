import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sensor_readings')
@Index('idx_reading_lookup', ['facilityId', 'sensorId', 'recordedAt'])
export class SensorReadingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 48 })
  facilityId: string;

  @Column({ length: 48 })
  sensorId: string;

  @Column({ length: 48 })
  nodeId: string;

  @Column({ type: 'double' })
  value: number;

  @Column({ length: 24 })
  unit: string;

  @Column({ length: 16 })
  severity: string;

  @Column({ type: 'datetime', precision: 3 })
  recordedAt: Date;
}

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('plant_sensors')
export class PlantSensorEntity {
  @PrimaryColumn({ length: 120 })
  id: string;

  @Column({ length: 80 })
  facilityId: string;

  @Column({ length: 48, default: 'map' })
  nodeId: string;

  @Column({ length: 48 })
  parameter: string;

  @Column({ length: 120 })
  label: string;

  @Column({ length: 32 })
  unit: string;

  @Column({ type: 'double' })
  min: number;

  @Column({ type: 'double' })
  max: number;

  @Column({ type: 'int', default: 2 })
  decimals: number;

  @Column({ type: 'double' })
  base: number;

  @Column({ type: 'double', default: 0 })
  amp: number;

  @Column({ type: 'boolean', default: false })
  diurnal: boolean;

  @Column({ type: 'double', nullable: true })
  warnLow: number | null;

  @Column({ type: 'double', nullable: true })
  warnHigh: number | null;

  @Column({ type: 'double', nullable: true })
  critLow: number | null;

  @Column({ type: 'double', nullable: true })
  critHigh: number | null;

  @Column({ type: 'double', nullable: true })
  target: number | null;

  @Column({ type: 'double' })
  seed: number;

  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  @Column({ type: 'double', nullable: true })
  lat: number | null;

  @Column({ type: 'double', nullable: true })
  lng: number | null;

  @Column({ length: 24, default: 'custom' })
  source: string;
}

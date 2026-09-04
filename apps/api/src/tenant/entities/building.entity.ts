import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ClientEntity } from './client.entity';

@Entity('buildings')
export class BuildingEntity {
  @PrimaryColumn({ length: 80 })
  id: string;

  @Column({ length: 48 })
  clientId: string;

  @ManyToOne(() => ClientEntity, (c) => c.buildings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: ClientEntity;

  @Column({ length: 160 })
  name: string;

  @Column({ length: 80 })
  shortName: string;

  @Column({ length: 24 })
  code: string;

  @Column({ length: 24 })
  kind: string;

  @Column({ type: 'varchar', length: 24, nullable: true })
  templateKind: string | null;

  @Column({ type: 'boolean', default: false })
  hasFullTwin: boolean;

  @Column({ type: 'double', default: 0 })
  designFlow: number;

  @Column({ type: 'int', default: 0 })
  population: number;

  @Column({ type: 'int', default: 0 })
  commissioned: number;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'double', nullable: true })
  lat: number | null;

  @Column({ type: 'double', nullable: true })
  lng: number | null;
}

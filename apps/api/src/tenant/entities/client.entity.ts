import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { BuildingEntity } from './building.entity';
import { UserEntity } from './user.entity';

@Entity('clients')
export class ClientEntity {
  @PrimaryColumn({ length: 48 })
  id: string;

  @Column({ length: 160 })
  name: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  contact: string | null;

  @Column({ type: 'varchar', length: 48, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => BuildingEntity, (b) => b.client)
  buildings: BuildingEntity[];

  @OneToMany(() => UserEntity, (u) => u.client)
  users: UserEntity[];
}

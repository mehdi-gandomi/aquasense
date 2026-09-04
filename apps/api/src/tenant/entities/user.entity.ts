import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { ClientEntity } from './client.entity';
import { UserBuildingEntity } from './user-building.entity';

@Entity('users')
export class UserEntity {
  @PrimaryColumn({ length: 48 })
  id: string;

  @Column({ length: 160, unique: true })
  email: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 120 })
  passwordHash: string;

  @Column({ length: 16 })
  role: 'ADMIN' | 'CLIENT';

  @Column({ type: 'varchar', length: 48, nullable: true })
  clientId: string | null;

  @ManyToOne(() => ClientEntity, (c) => c.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'clientId' })
  client: ClientEntity | null;

  @OneToMany(() => UserBuildingEntity, (ub) => ub.user, { cascade: true })
  buildings: UserBuildingEntity[];
}

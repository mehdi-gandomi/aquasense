import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { BuildingEntity } from './building.entity';

@Entity('user_buildings')
export class UserBuildingEntity {
  @PrimaryColumn({ length: 48 })
  userId: string;

  @PrimaryColumn({ length: 80 })
  buildingId: string;

  @ManyToOne(() => UserEntity, (u) => u.buildings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => BuildingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buildingId' })
  building: BuildingEntity;
}

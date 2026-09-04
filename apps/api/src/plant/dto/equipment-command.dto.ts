import { Allow, IsIn, IsOptional } from 'class-validator';

export class EquipmentCommandDto {
  @IsIn(['start', 'stop', 'setpoint', 'mode'])
  command: 'start' | 'stop' | 'setpoint' | 'mode';

  /** Setpoint number, or AUTO/MANUAL/LOCKOUT when command is `mode`. */
  @IsOptional()
  @Allow()
  value?: number | string;

  @IsOptional()
  @IsIn(['AUTO', 'MANUAL', 'LOCKOUT'])
  mode?: 'AUTO' | 'MANUAL' | 'LOCKOUT';
}

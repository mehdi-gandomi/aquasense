import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('shift_reports')
export class ShiftReportEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 48 })
  facilityId: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'longtext' })
  snapshotJson: string;

  @Column({ type: 'datetime', precision: 3 })
  createdAt: Date;
}

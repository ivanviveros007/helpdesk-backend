import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('customer_notes')
@Index(['org_id', 'customer_email'])
export class CustomerNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  org_id: string;

  @Column()
  customer_email: string;

  @Column('text')
  body: string;

  @Column()
  created_by: string; // nombre del agente/admin que escribió la nota

  @CreateDateColumn()
  created_at: Date;
}

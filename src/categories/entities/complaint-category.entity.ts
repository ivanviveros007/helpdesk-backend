import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('complaint_categories')
@Index(['org_id', 'slug'], { unique: true })
export class ComplaintCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  org_id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  icon: string; // nombre de ícono Lucide

  @Column({ nullable: true })
  color: string; // hex para el badge

  @Column({ default: 2 })
  default_priority: number; // 1=alta, 2=media, 3=baja

  @Column({ nullable: true, type: 'int' })
  sla_first_response_hours: number | null;

  @Column({ nullable: true, type: 'int' })
  sla_resolution_hours: number | null;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;
}

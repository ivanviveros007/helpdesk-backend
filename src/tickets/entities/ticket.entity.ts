import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Technician } from '../../technicians/entities/technician.entity';

export enum TicketStatus {
  PENDIENTE_IA = 'PENDIENTE_IA',
  ASIGNADO = 'ASIGNADO',
  RESUELTO = 'RESUELTO',
  CANCELADO = 'CANCELADO',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  asunto: string;

  @Column('text')
  descripcion_raw: string;

  @Column({ nullable: true })
  categoria: string;

  @Column({ nullable: true })
  prioridad: number;

  @Column({ nullable: true })
  nivel_asignado: number;

  @ManyToOne(() => Technician, { nullable: true, eager: true })
  @JoinColumn({ name: 'tecnico_asignado_id' })
  tecnico_asignado: Technician;

  @Column('text', { nullable: true })
  razonamiento_ia: string;

  @Column({ nullable: true })
  created_by_user_id: string;

  @Column({ nullable: true })
  created_by_name: string;

  @Column({ nullable: true })
  org_id: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.PENDIENTE_IA,
  })
  estado: TicketStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

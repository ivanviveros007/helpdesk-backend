import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Technician } from '../../technicians/entities/technician.entity';
import { TicketAttachment } from './ticket-attachment.entity';
import { TicketComment } from './ticket-comment.entity';

export enum TicketStatus {
  PENDIENTE_IA = 'PENDIENTE_IA',
  ASIGNADO = 'ASIGNADO',
  EN_PROGRESO = 'EN_PROGRESO',
  ESPERANDO_USUARIO = 'ESPERANDO_USUARIO',
  RESUELTO = 'RESUELTO',
  CANCELADO = 'CANCELADO',
}

export enum TicketChannel {
  FORM = 'form',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  WIDGET = 'widget',
  INSTAGRAM = 'instagram',
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

  @Column({ type: 'timestamp', nullable: true })
  last_activity_at: Date | null;

  @Column({ type: 'enum', enum: TicketChannel, default: TicketChannel.FORM })
  channel: TicketChannel;

  // Cliente final sin cuenta (reclamos por canales públicos)
  @Column({ nullable: true })
  customer_email: string;

  @Column({ nullable: true })
  customer_name: string;

  @Column({ nullable: true })
  customer_phone: string;

  @Column({ nullable: true, unique: true })
  tracking_token: string;

  @Column({ type: 'timestamp', nullable: true })
  tracking_token_expires_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  complaint_category_id: string | null;

  @Column({ nullable: true })
  order_reference: string;

  @OneToMany(() => TicketAttachment, (a) => a.ticket, { eager: true, cascade: true })
  attachments: TicketAttachment[];

  @OneToMany(() => TicketComment, (c) => c.ticket)
  comments: TicketComment[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

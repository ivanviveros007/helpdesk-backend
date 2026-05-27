import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('ticket_comments')
export class TicketComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ticket_id: string;

  @ManyToOne(() => Ticket, (t) => t.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column()
  author_id: string;

  @Column()
  author_name: string;

  @Column()
  author_role: string; // 'user' | 'technician' | 'admin'

  @Column('text')
  body: string;

  @Column('jsonb', { nullable: true, default: [] })
  attachments: Array<{ url: string; filename: string; mimetype: string; key: string }>;

  @CreateDateColumn()
  created_at: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('ticket_attachments')
export class TicketAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ticket_id: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column()
  filename: string;

  @Column()
  url: string;

  @Column()
  key: string;

  @Column()
  mimetype: string;

  @Column()
  size: number;

  @CreateDateColumn()
  created_at: Date;
}

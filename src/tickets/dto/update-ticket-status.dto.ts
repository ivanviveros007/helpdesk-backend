import { IsEnum } from 'class-validator';
import { TicketStatus } from '../entities/ticket.entity';

const TECHNICIAN_TRANSITIONS = [
  TicketStatus.EN_PROGRESO,
  TicketStatus.ESPERANDO_USUARIO,
  TicketStatus.RESUELTO,
] as const;

export class UpdateTicketStatusDto {
  @IsEnum(TECHNICIAN_TRANSITIONS)
  estado: (typeof TECHNICIAN_TRANSITIONS)[number];
}

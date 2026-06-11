import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '../entities/ticket.entity';

const TECHNICIAN_TRANSITIONS = [
  TicketStatus.EN_PROGRESO,
  TicketStatus.ESPERANDO_USUARIO,
  TicketStatus.RESUELTO,
] as const;

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TECHNICIAN_TRANSITIONS, example: TicketStatus.EN_PROGRESO })
  @IsEnum(TECHNICIAN_TRANSITIONS)
  estado: (typeof TECHNICIAN_TRANSITIONS)[number];
}

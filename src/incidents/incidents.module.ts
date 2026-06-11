import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incident } from './entities/incident.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketComment } from '../tickets/entities/ticket-comment.entity';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Incident, Ticket, TicketComment]),
    EmailModule,
  ],
  providers: [IncidentsService],
  controllers: [IncidentsController],
})
export class IncidentsModule {}

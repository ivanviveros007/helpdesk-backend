import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketsGateway } from './tickets.gateway';
import { TicketsCron } from './tickets.cron';
import { AiClientModule } from '../ai-client/ai-client.module';
import { TechniciansModule } from '../technicians/technicians.module';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketAttachment, TicketComment]),
    AiClientModule,
    TechniciansModule,
    EmailModule,
    UsersModule,
    UploadsModule,
  ],
  providers: [TicketsService, TicketsGateway, TicketsCron],
  controllers: [TicketsController],
  exports: [TicketsService],
})
export class TicketsModule {}

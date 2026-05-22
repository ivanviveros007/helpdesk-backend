import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketsGateway } from './tickets.gateway';
import { AiClientModule } from '../ai-client/ai-client.module';
import { TechniciansModule } from '../technicians/technicians.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket]),
    AiClientModule,
    TechniciansModule,
  ],
  providers: [TicketsService, TicketsGateway],
  controllers: [TicketsController],
  exports: [TicketsService],
})
export class TicketsModule {}

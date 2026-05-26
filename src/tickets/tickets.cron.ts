import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';

const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

@Injectable()
export class TicketsCron {
  private readonly logger = new Logger(TicketsCron.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly repo: Repository<Ticket>,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkInactiveTickets() {
    const cutoff = new Date(Date.now() - FORTY_EIGHT_HOURS);

    // Tickets in ESPERANDO_USUARIO for >48h → email the user
    const waitingTickets = await this.repo.find({
      where: { estado: TicketStatus.ESPERANDO_USUARIO, updated_at: LessThan(cutoff) },
    });

    for (const ticket of waitingTickets) {
      if (!ticket.created_by_user_id) continue;
      const user = await this.usersService.findById(ticket.created_by_user_id).catch(() => null);
      if (!user?.email) continue;
      await this.emailService.sendInactivityAlert({
        to: { nombre: user.nombre, email: user.email },
        ticket: { id: ticket.id, asunto: ticket.asunto },
        type: 'user_pending',
      });
    }

    // Tickets in ASIGNADO (never started) for >48h → email admin
    // We can't easily fetch the admin from here without org lookup, so we log for now
    const stalledTickets = await this.repo.find({
      where: { estado: TicketStatus.ASIGNADO, updated_at: LessThan(cutoff) },
      relations: { tecnico_asignado: true },
    });

    for (const ticket of stalledTickets) {
      if (!ticket.tecnico_asignado?.email) continue;
      await this.emailService.sendInactivityAlert({
        to: {
          nombre: ticket.tecnico_asignado.nombre,
          email: ticket.tecnico_asignado.email,
        },
        ticket: { id: ticket.id, asunto: ticket.asunto },
        type: 'admin_not_started',
      });
      this.logger.log(`Inactivity alert sent for stalled ticket ${ticket.id}`);
    }

    if (waitingTickets.length + stalledTickets.length > 0) {
      this.logger.log(`Inactivity check: ${waitingTickets.length} waiting, ${stalledTickets.length} stalled`);
    }
  }
}

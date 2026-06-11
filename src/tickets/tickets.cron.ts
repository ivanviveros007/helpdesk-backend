import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';

const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
const TWO_HOURS = 2 * 60 * 60 * 1000;

@Injectable()
export class TicketsCron {
  private readonly logger = new Logger(TicketsCron.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly repo: Repository<Ticket>,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  /** CSAT: reclamos resueltos hace >2h, con email de cliente, sin encuesta enviada. */
  @Cron(CronExpression.EVERY_HOUR)
  async sendPendingCsatSurveys() {
    const cutoff = new Date(Date.now() - TWO_HOURS);
    const tickets = await this.repo.find({
      where: {
        estado: TicketStatus.RESUELTO,
        csat_sent_at: IsNull(),
        customer_email: Not(IsNull()),
        tracking_token: Not(IsNull()),
        updated_at: LessThan(cutoff),
      },
      take: 50,
    });

    for (const ticket of tickets) {
      const org = ticket.org_id
        ? await this.organizationsService.findById(ticket.org_id).catch(() => null)
        : null;
      await this.emailService.sendCsatRequest({
        to: { nombre: ticket.customer_name ?? 'Cliente', email: ticket.customer_email },
        org_nombre: org?.nombre ?? 'Soporte',
        ticket: { id: ticket.id },
        tracking_token: ticket.tracking_token,
        language: org?.portal_language,
      });
      ticket.csat_sent_at = new Date();
      await this.repo.save(ticket);
    }

    if (tickets.length > 0) {
      this.logger.log(`CSAT surveys sent: ${tickets.length}`);
    }
  }

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

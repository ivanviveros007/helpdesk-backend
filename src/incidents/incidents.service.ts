import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Incident, IncidentStatus } from './entities/incident.entity';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity';
import { TicketComment } from '../tickets/entities/ticket-comment.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    @InjectRepository(Incident)
    private readonly repo: Repository<Incident>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private readonly commentRepo: Repository<TicketComment>,
    private readonly emailService: EmailService,
  ) {}

  async findAll(orgId: string) {
    const incidents = await this.repo.find({
      where: { org_id: orgId },
      order: { created_at: 'DESC' },
    });
    return Promise.all(
      incidents.map(async (incident) => ({
        ...incident,
        affected_count: await this.ticketRepo.countBy({ incident_id: incident.id }),
      })),
    );
  }

  async findOne(id: string, orgId: string) {
    const incident = await this.repo.findOneBy({ id, org_id: orgId });
    if (!incident) throw new NotFoundException(`Incident ${id} not found`);
    const tickets = await this.ticketRepo.find({
      where: { incident_id: id },
      order: { created_at: 'DESC' },
    });
    return { ...incident, affected_count: tickets.length, tickets };
  }

  create(
    data: { title: string; description?: string },
    orgId: string,
    createdBy: string,
  ): Promise<Incident> {
    const incident = this.repo.create({ ...data, org_id: orgId, created_by: createdBy });
    return this.repo.save(incident);
  }

  async linkTickets(id: string, ticketIds: string[], orgId: string) {
    await this.assertExists(id, orgId);
    await this.ticketRepo.update(
      { id: In(ticketIds), org_id: orgId },
      { incident_id: id },
    );
    return { linked: ticketIds.length };
  }

  async unlinkTicket(id: string, ticketId: string, orgId: string) {
    await this.assertExists(id, orgId);
    await this.ticketRepo.update({ id: ticketId, org_id: orgId }, { incident_id: null });
    return { unlinked: ticketId };
  }

  /** Publica una actualización a TODOS los clientes de los reclamos vinculados. */
  async broadcast(id: string, message: string, orgId: string, authorName: string) {
    const incident = await this.assertExists(id, orgId);
    incident.update_message = message;
    await this.repo.save(incident);

    const tickets = await this.ticketRepo.findBy({ incident_id: id, org_id: orgId });
    let notified = 0;

    for (const ticket of tickets) {
      // Comentario visible en el hilo de cada reclamo
      await this.commentRepo.save(
        this.commentRepo.create({
          ticket_id: ticket.id,
          author_id: 'incident',
          author_name: authorName,
          author_role: 'admin',
          body: message,
          attachments: [],
        }),
      );

      // Email al cliente final (si tiene email)
      const email = ticket.customer_email;
      if (email) {
        this.emailService
          .sendIncidentUpdate({
            to: { nombre: ticket.customer_name ?? 'Cliente', email },
            ticket: { id: ticket.id },
            incident: { title: incident.title },
            message,
            tracking_token: ticket.tracking_token,
          })
          .catch((err) =>
            this.logger.error(`Incident broadcast email failed for ${ticket.id}`, err),
          );
        notified++;
      }
    }

    return { tickets: tickets.length, notified };
  }

  /** Resuelve el incidente y todos sus reclamos vinculados. */
  async resolve(id: string, resolutionMessage: string, orgId: string, authorName: string) {
    const incident = await this.assertExists(id, orgId);

    await this.broadcast(id, resolutionMessage, orgId, authorName);

    await this.ticketRepo.update(
      { incident_id: id, org_id: orgId, estado: Not(In([TicketStatus.RESUELTO, TicketStatus.CANCELADO])) },
      { estado: TicketStatus.RESUELTO, last_activity_at: new Date() },
    );

    incident.status = IncidentStatus.RESOLVED;
    incident.resolved_at = new Date();
    await this.repo.save(incident);

    return this.findOne(id, orgId);
  }

  /** Detección de patrón: N+ reclamos de la misma categoría en las últimas 24hs. */
  async detectPattern(orgId: string, threshold = 5) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows: Array<{ category_id: string; count: string }> = await this.ticketRepo
      .createQueryBuilder('t')
      .select('t.complaint_category_id', 'category_id')
      .addSelect('COUNT(*)', 'count')
      .where('t.org_id = :orgId', { orgId })
      .andWhere('t.created_at > :since', { since })
      .andWhere('t.complaint_category_id IS NOT NULL')
      .andWhere('t.incident_id IS NULL')
      .groupBy('t.complaint_category_id')
      .having('COUNT(*) >= :threshold', { threshold })
      .getRawMany();
    return rows.map((r) => ({ category_id: r.category_id, count: parseInt(r.count) }));
  }

  private async assertExists(id: string, orgId: string): Promise<Incident> {
    const incident = await this.repo.findOneBy({ id, org_id: orgId });
    if (!incident) throw new NotFoundException(`Incident ${id} not found`);
    return incident;
  }
}

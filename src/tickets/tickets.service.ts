import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Not, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Ticket, TicketChannel, TicketStatus } from './entities/ticket.entity';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AiDecisionDto } from './dto/ai-decision.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { AiClientService } from '../ai-client/ai-client.service';
import { TechniciansService } from '../technicians/technicians.service';
import { TicketsGateway } from './tickets.gateway';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { UploadsService } from '../uploads/uploads.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { WhatsappService } from '../integrations/whatsapp.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly repo: Repository<Ticket>,
    @InjectRepository(TicketAttachment)
    private readonly attachmentRepo: Repository<TicketAttachment>,
    @InjectRepository(TicketComment)
    private readonly commentRepo: Repository<TicketComment>,
    private readonly aiClient: AiClientService,
    private readonly techniciansService: TechniciansService,
    private readonly gateway: TicketsGateway,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
    private readonly uploadsService: UploadsService,
    @Inject(forwardRef(() => IntegrationsService))
    private readonly integrationsService: IntegrationsService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
  ) {}

  async create(dto: CreateTicketDto, requester: { id: string; nombre: string; entity_type: string; org_id: string | null }): Promise<{ ticket_id: string; status: string }> {
    const data: DeepPartial<Ticket> = {
      asunto: dto.asunto,
      descripcion_raw: dto.descripcion,
      estado: TicketStatus.PENDIENTE_IA,
      created_by_user_id: requester.entity_type === 'user' ? requester.id : undefined,
      created_by_name: requester.nombre,
      org_id: requester.org_id ?? undefined,
    };
    const ticket = this.repo.create(data);
    const saved = await this.repo.save(ticket);

    this.processWithAi(saved.id, dto.asunto, dto.descripcion, saved.org_id).catch((err) =>
      this.logger.error(`AI processing failed for ticket ${saved.id}`, err),
    );

    return { ticket_id: saved.id, status: saved.estado };
  }

  /** Crea un reclamo desde el portal público — cliente final sin cuenta. */
  async createPublicComplaint(params: {
    org_id: string;
    org_slug: string;
    org_nombre: string;
    org_language?: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    order_reference?: string;
    category_name: string;
    category_id: string;
    description: string;
    channel: TicketChannel;
  }): Promise<{ ticket_id: string; tracking_token: string }> {
    const tracking_token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const asunto = `[${params.category_name}] ${params.description.slice(0, 80)}`;
    const ticket = this.repo.create({
      asunto,
      descripcion_raw: params.description,
      estado: TicketStatus.PENDIENTE_IA,
      created_by_name: params.customer_name,
      org_id: params.org_id,
      channel: params.channel,
      customer_email: params.customer_email,
      customer_name: params.customer_name,
      customer_phone: params.customer_phone,
      order_reference: params.order_reference,
      complaint_category_id: params.category_id,
      tracking_token,
      tracking_token_expires_at: expiresAt,
    });
    const saved = await this.repo.save(ticket);

    this.processWithAi(saved.id, asunto, params.description, saved.org_id).catch((err) =>
      this.logger.error(`AI processing failed for public complaint ${saved.id}`, err),
    );

    if (params.customer_email) {
      this.emailService
        .sendComplaintReceived({
          customer: { nombre: params.customer_name, email: params.customer_email },
          org: { nombre: params.org_nombre, slug: params.org_slug, language: params.org_language },
          ticket: { id: saved.id, asunto },
          tracking_token,
        })
        .catch((err) =>
          this.logger.error(`Could not send complaint confirmation for ${saved.id}`, err),
        );
    } else if (params.channel === TicketChannel.WHATSAPP && params.customer_phone) {
      const shortId = saved.id.slice(0, 8).toUpperCase();
      const confirmMsg =
        params.org_language === 'en'
          ? `✅ We received your request #${shortId}. We'll keep you posted right here. — ${params.org_nombre}`
          : `✅ Recibimos tu reclamo #${shortId}. Te vamos respondiendo por acá. — ${params.org_nombre}`;
      this.logger.log(`Sending WhatsApp confirmation to ${params.customer_phone}, service available: ${!!this.whatsappService}`);
      if (this.whatsappService) {
        this.whatsappService.sendMessage(params.customer_phone, confirmMsg).catch((err) =>
          this.logger.error(`WhatsApp confirmation error: ${err.message}`),
        );
      }
    }

    this.integrationsService.notify(params.org_id, {
      type: 'complaint.created',
      title: `🆕 Nuevo reclamo #${saved.id.slice(0, 8).toUpperCase()}`,
      lines: [
        `Cliente: ${params.customer_name}`,
        `Categoría: ${params.category_name}`,
        `Canal: ${params.channel}`,
      ],
    });

    return { ticket_id: saved.id, tracking_token };
  }

  /** Reclamo abierto más reciente de un cliente por teléfono (hilo de WhatsApp). */
  findOpenByCustomerPhone(orgId: string, phone: string): Promise<Ticket | null> {
    return this.repo.findOne({
      where: {
        org_id: orgId,
        customer_phone: phone,
        estado: Not(In([TicketStatus.RESUELTO, TicketStatus.CANCELADO])),
      },
      order: { created_at: 'DESC' },
    });
  }

  /** Busca un reclamo por tracking token. Lanza 404 si no existe o expiró. */
  async findByTrackingToken(token: string): Promise<Ticket> {
    const ticket = await this.repo.findOne({
      where: { tracking_token: token },
      relations: { comments: true },
      order: { comments: { created_at: 'ASC' } },
    });
    if (!ticket) throw new NotFoundException('Reclamo no encontrado');
    if (
      ticket.tracking_token_expires_at &&
      ticket.tracking_token_expires_at < new Date()
    ) {
      throw new NotFoundException('El link de seguimiento expiró');
    }
    return ticket;
  }

  /** Agrega una respuesta del cliente final vía link de seguimiento. */
  async addPublicReply(token: string, body: string): Promise<TicketComment> {
    const ticket = await this.findByTrackingToken(token);

    const comment = this.commentRepo.create({
      ticket_id: ticket.id,
      author_id: ticket.customer_email,
      author_name: ticket.customer_name ?? 'Cliente',
      author_role: 'user',
      body,
      attachments: [],
    });
    const saved = await this.commentRepo.save(comment);

    ticket.last_activity_at = new Date();
    if (ticket.estado === TicketStatus.ESPERANDO_USUARIO) {
      ticket.estado = TicketStatus.EN_PROGRESO;
    }
    await this.repo.save(ticket);

    this.gateway.emitNewComment({
      ticketId: ticket.id,
      technicianId: ticket.tecnico_asignado?.id ?? null,
      userId: null,
      comment: {
        id: saved.id,
        author_name: saved.author_name,
        author_role: saved.author_role,
        body: saved.body,
        attachments: [],
        created_at: saved.created_at.toISOString(),
      },
    });

    return saved;
  }

  /** Guarda el score CSAT (1-5) de un reclamo. */
  async saveCsat(ticketId: string, score: number, comment?: string): Promise<void> {
    if (score < 1 || score > 5) {
      throw new BadRequestException('Score must be between 1 and 5');
    }
    await this.repo.update(
      { id: ticketId },
      { csat_score: score, csat_comment: comment ?? null },
    );
  }

  /** Contexto del cliente para el panel lateral del agente. */
  async getCustomerContext(ticketId: string, org_id?: string | null) {
    const ticket = await this.findOne(ticketId);

    const customerKey = ticket.customer_email ?? ticket.created_by_user_id;
    let history: Ticket[] = [];
    if (customerKey) {
      const query = this.repo
        .createQueryBuilder('t')
        .where('t.id != :id', { id: ticketId })
        .orderBy('t.created_at', 'DESC')
        .take(5);
      if (ticket.customer_email) {
        query.andWhere('t.customer_email = :email', { email: ticket.customer_email });
      } else {
        query.andWhere('t.created_by_user_id = :uid', { uid: ticket.created_by_user_id });
      }
      if (org_id) query.andWhere('t.org_id = :org_id', { org_id });
      history = await query.getMany();
    }

    return {
      customer: {
        name: ticket.customer_name ?? ticket.created_by_name,
        email: ticket.customer_email,
        phone: ticket.customer_phone,
        channel: ticket.channel,
      },
      order_reference: ticket.order_reference,
      history: history.map((t) => ({
        id: t.id,
        asunto: t.asunto,
        estado: t.estado,
        created_at: t.created_at,
      })),
    };
  }

  async findAll(org_id?: string | null): Promise<Ticket[]> {
    const where = org_id ? { org_id } : {};
    return this.repo.find({ where, order: { created_at: 'DESC' } });
  }

  async findByUser(userId: string, org_id?: string | null): Promise<Ticket[]> {
    return this.repo.find({
      where: { created_by_user_id: userId, ...(org_id ? { org_id } : {}) },
      order: { created_at: 'DESC' },
    });
  }

  async findAllForAdmin(org_id?: string | null, filters?: { tecnico_id?: string; estado?: string; nivel?: string }): Promise<Ticket[]> {
    const query = this.repo.createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.tecnico_asignado', 'tech')
      .orderBy('ticket.created_at', 'DESC');

    if (org_id) query.andWhere('ticket.org_id = :org_id', { org_id });
    if (filters?.tecnico_id) query.andWhere('tech.id = :tecnico_id', { tecnico_id: filters.tecnico_id });
    if (filters?.estado) query.andWhere('ticket.estado = :estado', { estado: filters.estado });
    if (filters?.nivel) query.andWhere('ticket.nivel_asignado = :nivel', { nivel: parseInt(filters.nivel) });

    return query.getMany();
  }

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.repo.findOneBy({ id });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    return ticket;
  }

  async findByTechnician(technicianId: string): Promise<Ticket[]> {
    return this.repo.find({
      where: { tecnico_asignado: { id: technicianId } },
      order: { updated_at: 'DESC' },
    });
  }

  async markResolved(id: string): Promise<Ticket> {
    const ticket = await this.findOne(id);
    ticket.estado = TicketStatus.RESUELTO;
    const saved = await this.repo.save(ticket);

    if (ticket.tecnico_asignado?.id) {
      await this.techniciansService.decrementCarga(ticket.tecnico_asignado.id);
    }

    this.emitStatusChange(saved);

    if (saved.created_by_user_id) {
      this.usersService.findById(saved.created_by_user_id).then((user) => {
        if (user) {
          this.emailService.sendTicketResolved({
            user: { nombre: user.nombre, email: user.email },
            ticket: { id: saved.id, asunto: saved.asunto },
          });
        }
      }).catch((err) => this.logger.error(`Could not send resolution email for ticket ${id}`, err));
    }

    return saved;
  }

  async cancelTicket(id: string, userId: string): Promise<Ticket> {
    const ticket = await this.findOne(id);
    if (ticket.created_by_user_id !== userId) throw new ForbiddenException('No podés cancelar este ticket');
    if (ticket.estado === TicketStatus.RESUELTO) throw new BadRequestException('No podés cancelar un ticket ya resuelto');
    if (ticket.estado === TicketStatus.CANCELADO) throw new BadRequestException('El ticket ya está cancelado');

    if (ticket.tecnico_asignado?.id) {
      await this.techniciansService.decrementCarga(ticket.tecnico_asignado.id);
    }

    ticket.estado = TicketStatus.CANCELADO;
    return this.repo.save(ticket);
  }

  async deleteTicket(id: string, userId: string): Promise<void> {
    const ticket = await this.findOne(id);
    if (ticket.created_by_user_id !== userId) throw new ForbiddenException('No podés eliminar este ticket');

    if (ticket.tecnico_asignado?.id && ticket.estado === TicketStatus.ASIGNADO) {
      await this.techniciansService.decrementCarga(ticket.tecnico_asignado.id);
    }

    // Delete files from R2
    for (const att of ticket.attachments ?? []) {
      await this.uploadsService.deleteFile(att.key).catch(() => null);
    }

    await this.repo.delete(id);
  }

  async updateStatus(id: string, dto: UpdateTicketStatusDto, technicianId: string): Promise<Ticket> {
    const ticket = await this.findOne(id);

    if (!ticket.tecnico_asignado || ticket.tecnico_asignado.id !== technicianId) {
      throw new ForbiddenException('Solo el técnico asignado puede cambiar el estado');
    }

    const terminal = [TicketStatus.RESUELTO, TicketStatus.CANCELADO];
    if (terminal.includes(ticket.estado)) {
      throw new BadRequestException('El ticket ya está cerrado');
    }

    const wasOpen = ticket.tecnico_asignado?.id && ticket.estado !== TicketStatus.RESUELTO;
    ticket.estado = dto.estado;
    ticket.last_activity_at = new Date();

    if (dto.estado === TicketStatus.RESUELTO && wasOpen) {
      await this.techniciansService.decrementCarga(ticket.tecnico_asignado.id);
    }

    const saved = await this.repo.save(ticket);

    this.emitStatusChange(saved);

    if (dto.estado === TicketStatus.RESUELTO && saved.created_by_user_id) {
      this.usersService.findById(saved.created_by_user_id).then((user) => {
        if (user) {
          this.emailService.sendTicketResolved({
            user: { nombre: user.nombre, email: user.email },
            ticket: { id: saved.id, asunto: saved.asunto },
          });
        }
      }).catch((err) => this.logger.error(`Could not send resolution email for ticket ${id}`, err));
    }

    return saved;
  }

  async userResponded(id: string, userId: string): Promise<Ticket> {
    const ticket = await this.findOne(id);

    if (ticket.created_by_user_id !== userId) {
      throw new ForbiddenException('No podés responder a este ticket');
    }
    if (ticket.estado !== TicketStatus.ESPERANDO_USUARIO) {
      throw new BadRequestException('El ticket no está esperando tu respuesta');
    }

    ticket.estado = TicketStatus.EN_PROGRESO;
    ticket.last_activity_at = new Date();
    return this.repo.save(ticket);
  }

  async findOneWithComments(id: string): Promise<Ticket> {
    const ticket = await this.repo.findOne({ where: { id }, relations: { comments: true } });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    ticket.comments.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    return ticket;
  }

  async addComment(
    ticketId: string,
    dto: AddCommentDto,
    author: { id: string; nombre: string; role: string },
    files: Express.Multer.File[] = [],
  ): Promise<TicketComment> {
    const ticket = await this.findOne(ticketId);

    const attachments: Array<{ url: string; filename: string; mimetype: string; key: string }> = [];
    for (const file of files) {
      const { key, url } = await this.uploadsService.uploadFile(file, `tickets/${ticketId}/comments`);
      attachments.push({ url, filename: file.originalname, mimetype: file.mimetype, key });
    }

    const comment = this.commentRepo.create({
      ticket_id: ticketId,
      author_id: author.id,
      author_name: author.nombre,
      author_role: author.role,
      body: dto.body,
      attachments,
    });
    const saved = await this.commentRepo.save(comment);

    // SLA: registrar primera respuesta de un agente
    if (
      !ticket.first_response_at &&
      (author.role === 'technician' || author.role === 'admin')
    ) {
      ticket.first_response_at = saved.created_at;
      await this.repo.save(ticket);
    }

    // Reclamo de WhatsApp: la respuesta del agente le llega al cliente por WhatsApp
    if (
      ticket.channel === TicketChannel.WHATSAPP &&
      ticket.customer_phone &&
      (author.role === 'technician' || author.role === 'admin')
    ) {
      void this.whatsappService.sendMessage(ticket.customer_phone, dto.body);
    }

    this.gateway.emitNewComment({
      ticketId,
      technicianId: ticket.tecnico_asignado?.id ?? null,
      userId: ticket.created_by_user_id ?? null,
      comment: {
        id: saved.id,
        author_name: saved.author_name,
        author_role: saved.author_role,
        body: saved.body,
        attachments: saved.attachments ?? [],
        created_at: saved.created_at.toISOString(),
      },
    });

    // Email to the other party
    const isFromTech = author.role === 'technician' || author.role === 'admin';
    if (isFromTech && ticket.created_by_user_id) {
      this.usersService.findById(ticket.created_by_user_id).then((user) => {
        if (user?.email) {
          this.emailService.sendNewComment({
            to: { nombre: user.nombre, email: user.email },
            from: { nombre: author.nombre, role: author.role },
            ticket: { id: ticket.id, asunto: ticket.asunto },
            body: dto.body,
          });
        }
      }).catch(() => null);
    } else if (!isFromTech && ticket.tecnico_asignado?.email) {
      this.emailService.sendNewComment({
        to: { nombre: ticket.tecnico_asignado.nombre, email: ticket.tecnico_asignado.email },
        from: { nombre: author.nombre, role: author.role },
        ticket: { id: ticket.id, asunto: ticket.asunto },
        body: dto.body,
      });
    }

    return saved;
  }

  async addAttachments(ticketId: string, files: Express.Multer.File[]): Promise<TicketAttachment[]> {
    const ticket = await this.findOne(ticketId);
    const saved: TicketAttachment[] = [];

    for (const file of files) {
      const { key, url } = await this.uploadsService.uploadFile(file, `tickets/${ticketId}`);
      const attachment = this.attachmentRepo.create({
        ticket_id: ticket.id,
        filename: file.originalname,
        url,
        key,
        mimetype: file.mimetype,
        size: file.size,
      });
      saved.push(await this.attachmentRepo.save(attachment));
    }

    return saved;
  }

  async applyAiDecision(decision: AiDecisionDto): Promise<Ticket> {
    const ticket = await this.findOne(decision.ticket_id);

    ticket.categoria = decision.category;
    ticket.prioridad = decision.priority;
    ticket.nivel_asignado = decision.suggested_level;
    ticket.razonamiento_ia = decision.reasoning;
    ticket.estado = TicketStatus.ASIGNADO;

    if (decision.assigned_tecnico_id) {
      const tech = await this.techniciansService.findOne(decision.assigned_tecnico_id);
      ticket.tecnico_asignado = tech;
      await this.techniciansService.incrementCarga(tech.id);
    }

    const saved = await this.repo.save(ticket);

    this.gateway.emitTicketUpdated({
      ticketId: saved.id,
      status: saved.estado,
      category: saved.categoria,
      priority: saved.prioridad,
      level: saved.nivel_asignado,
      assignedTechnicianId: saved.tecnico_asignado?.id ?? null,
      assignedTechnicianName: saved.tecnico_asignado?.nombre ?? null,
      reasoning: saved.razonamiento_ia,
      createdByUserId: saved.created_by_user_id ?? null,
      updatedAt: saved.updated_at.toISOString(),
    });

    // Email al técnico asignado
    if (saved.tecnico_asignado?.email) {
      this.emailService.sendTicketAssigned({
        tech: {
          nombre: saved.tecnico_asignado.nombre,
          email: saved.tecnico_asignado.email,
        },
        ticket: {
          id: saved.id,
          asunto: saved.asunto,
          descripcion_raw: saved.descripcion_raw,
          categoria: saved.categoria ?? null,
          prioridad: saved.prioridad ?? null,
          nivel_asignado: saved.nivel_asignado ?? null,
          razonamiento_ia: saved.razonamiento_ia ?? null,
          created_by_name: saved.created_by_name ?? null,
        },
      });
    }

    // Email al usuario que creó el ticket
    if (saved.created_by_user_id && saved.tecnico_asignado) {
      this.usersService.findById(saved.created_by_user_id).then((user) => {
        if (user?.email) {
          this.emailService.sendTicketAssignedToUser({
            user: { nombre: user.nombre, email: user.email },
            ticket: {
              id: saved.id,
              asunto: saved.asunto,
              prioridad: saved.prioridad ?? null,
              nivel_asignado: saved.nivel_asignado ?? null,
            },
            tech: { nombre: saved.tecnico_asignado!.nombre },
          });
        }
      }).catch((err) => this.logger.error(`Could not fetch user for assignment email on ticket ${saved.id}`, err));
    }

    return saved;
  }

  async getMetrics(org_id: string) {
    const byStatus = await this.repo
      .createQueryBuilder('ticket')
      .select('ticket.estado', 'estado')
      .addSelect('COUNT(*)', 'count')
      .where('ticket.org_id = :org_id', { org_id })
      .groupBy('ticket.estado')
      .getRawMany();

    const ticketsEsteMes = await this.repo
      .createQueryBuilder('ticket')
      .where('ticket.org_id = :org_id', { org_id })
      .andWhere("DATE_TRUNC('month', ticket.created_at) = DATE_TRUNC('month', NOW())")
      .getCount();

    const avgRes = await this.repo
      .createQueryBuilder('ticket')
      .select("AVG(EXTRACT(EPOCH FROM (ticket.updated_at - ticket.created_at)) / 3600)", 'avg_hours')
      .where('ticket.org_id = :org_id', { org_id })
      .andWhere('ticket.estado = :estado', { estado: TicketStatus.RESUELTO })
      .getRawOne();

    const byTech = await this.repo
      .createQueryBuilder('ticket')
      .leftJoin('ticket.tecnico_asignado', 'tech')
      .select('tech.nombre', 'nombre')
      .addSelect('tech.carga_actual', 'carga_actual')
      .addSelect('COUNT(*)', 'total')
      .where('ticket.org_id = :org_id', { org_id })
      .andWhere('tech.id IS NOT NULL')
      .groupBy('tech.id')
      .addGroupBy('tech.nombre')
      .addGroupBy('tech.carga_actual')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    return {
      by_status: byStatus.map((r) => ({ estado: r.estado, count: parseInt(r.count) })),
      tickets_este_mes: ticketsEsteMes,
      avg_resolution_hours: avgRes?.avg_hours ? parseFloat(parseFloat(avgRes.avg_hours).toFixed(1)) : null,
      by_technician: byTech.map((t) => ({
        nombre: t.nombre,
        carga_actual: t.carga_actual ?? 0,
        total_asignados: parseInt(t.total),
      })),
    };
  }

  /** Reasigna el reclamo a otro agente. Permitido para el agente asignado o un admin de la org. */
  async reassign(id: string, newTechId: string, actor: { id: string; role: string }): Promise<Ticket> {
    const ticket = await this.findOne(id);

    const isAssignee = ticket.tecnico_asignado?.id === actor.id;
    if (actor.role !== 'admin' && !isAssignee) {
      throw new ForbiddenException('Solo el agente asignado o un admin pueden reasignar');
    }
    if ([TicketStatus.RESUELTO, TicketStatus.CANCELADO].includes(ticket.estado)) {
      throw new BadRequestException('El ticket ya está cerrado');
    }
    if (ticket.tecnico_asignado?.id === newTechId) {
      throw new BadRequestException('El reclamo ya está asignado a ese agente');
    }

    const newTech = await this.techniciansService.findOne(newTechId, ticket.org_id ?? undefined);
    if (!newTech.estado_activo) {
      throw new BadRequestException('El agente destino está inactivo');
    }

    const previousTechId = ticket.tecnico_asignado?.id;
    ticket.tecnico_asignado = newTech;
    ticket.nivel_asignado = newTech.nivel?.numero_nivel ?? ticket.nivel_asignado;
    if (ticket.estado === TicketStatus.EN_PROGRESO) ticket.estado = TicketStatus.ASIGNADO;
    ticket.last_activity_at = new Date();
    const saved = await this.repo.save(ticket);

    // Ajustar cargas
    if (previousTechId) await this.techniciansService.decrementCarga(previousTechId);
    await this.techniciansService.incrementCarga(newTech.id);

    this.emitStatusChange(saved);
    this.logger.log(`Ticket ${id} reassigned ${previousTechId ?? 'none'} → ${newTech.id} by ${actor.id}`);
    return saved;
  }

  /** Agentes activos de la org del ticket, para el selector de reasignación. */
  async getReassignOptions(ticketId: string) {
    const ticket = await this.findOne(ticketId);
    const techs = await this.techniciansService.findAll(ticket.org_id ?? undefined);
    return techs
      .filter((t) => t.estado_activo)
      .map((t) => ({
        id: t.id,
        nombre: t.nombre,
        carga_actual: t.carga_actual,
        nivel: t.nivel?.numero_nivel ?? null,
        skills: t.skills?.map((s) => s.nombre_tecnologia) ?? [],
      }));
  }

  private emitStatusChange(ticket: Ticket): void {
    this.gateway.emitTicketUpdated({
      ticketId: ticket.id,
      status: ticket.estado,
      category: ticket.categoria ?? null,
      priority: ticket.prioridad ?? null,
      level: ticket.nivel_asignado ?? null,
      assignedTechnicianId: ticket.tecnico_asignado?.id ?? null,
      assignedTechnicianName: ticket.tecnico_asignado?.nombre ?? null,
      reasoning: ticket.razonamiento_ia ?? null,
      createdByUserId: ticket.created_by_user_id ?? null,
      updatedAt: ticket.updated_at.toISOString(),
    });
  }

  private async processWithAi(ticketId: string, asunto: string, descripcion: string, orgId?: string | null): Promise<void> {
    const decision = await this.aiClient.analyzeTicket({ ticket_id: ticketId, asunto, descripcion, org_id: orgId });
    await this.applyAiDecision(decision);
    this.logger.log(`Ticket ${ticketId} processed → level ${decision.suggested_level}, tech ${decision.assigned_tecnico_id}`);
  }
}

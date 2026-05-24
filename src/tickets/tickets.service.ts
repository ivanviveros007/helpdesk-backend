import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AiDecisionDto } from './dto/ai-decision.dto';
import { AiClientService } from '../ai-client/ai-client.service';
import { TechniciansService } from '../technicians/technicians.service';
import { TicketsGateway } from './tickets.gateway';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly repo: Repository<Ticket>,
    private readonly aiClient: AiClientService,
    private readonly techniciansService: TechniciansService,
    private readonly gateway: TicketsGateway,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
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

    this.processWithAi(saved.id, dto.asunto, dto.descripcion).catch((err) =>
      this.logger.error(`AI processing failed for ticket ${saved.id}`, err),
    );

    return { ticket_id: saved.id, status: saved.estado };
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

    // Email al usuario que creó el ticket
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

    return saved;
  }

  private async processWithAi(ticketId: string, asunto: string, descripcion: string): Promise<void> {
    const decision = await this.aiClient.analyzeTicket({ ticket_id: ticketId, asunto, descripcion });
    await this.applyAiDecision(decision);
    this.logger.log(`Ticket ${ticketId} processed → level ${decision.suggested_level}, tech ${decision.assigned_tecnico_id}`);
  }
}

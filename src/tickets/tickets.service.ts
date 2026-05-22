import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AiDecisionDto } from './dto/ai-decision.dto';
import { AiClientService } from '../ai-client/ai-client.service';
import { TechniciansService } from '../technicians/technicians.service';
import { TicketsGateway } from './tickets.gateway';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly repo: Repository<Ticket>,
    private readonly aiClient: AiClientService,
    private readonly techniciansService: TechniciansService,
    private readonly gateway: TicketsGateway,
  ) {}

  async create(dto: CreateTicketDto): Promise<{ ticket_id: string; status: string }> {
    const ticket = this.repo.create({
      asunto: dto.asunto,
      descripcion_raw: dto.descripcion,
      estado: TicketStatus.PENDIENTE_IA,
    });
    const saved = await this.repo.save(ticket);

    // Fire-and-forget: process asynchronously
    this.processWithAi(saved.id, dto.asunto, dto.descripcion).catch((err) =>
      this.logger.error(`AI processing failed for ticket ${saved.id}`, err),
    );

    return { ticket_id: saved.id, status: saved.estado };
  }

  async findAll(): Promise<Ticket[]> {
    return this.repo.find({ order: { created_at: 'DESC' } });
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

    return saved;
  }

  // Called by the AI service callback endpoint
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
      updatedAt: saved.updated_at.toISOString(),
    });

    return saved;
  }

  private async processWithAi(
    ticketId: string,
    asunto: string,
    descripcion: string,
  ): Promise<void> {
    const decision = await this.aiClient.analyzeTicket({
      ticket_id: ticketId,
      asunto,
      descripcion,
    });
    await this.applyAiDecision(decision);
    this.logger.log(`Ticket ${ticketId} processed → level ${decision.suggested_level}, tech ${decision.assigned_tecnico_id}`);
  }
}

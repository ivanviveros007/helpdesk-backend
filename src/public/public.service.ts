import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationsService } from '../organizations/organizations.service';
import { CategoriesService } from '../categories/categories.service';
import { TicketsService } from '../tickets/tickets.service';
import { TicketChannel } from '../tickets/entities/ticket.entity';
import { CreatePublicComplaintDto } from './dto/create-public-complaint.dto';

@Injectable()
export class PublicService {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly categoriesService: CategoriesService,
    private readonly ticketsService: TicketsService,
  ) {}

  /** Datos públicos del portal de una org: branding + categorías activas. */
  async getPortalInfo(orgSlug: string) {
    const org = await this.findPortalOrg(orgSlug);
    const categories = await this.categoriesService.findAll(org.id, true);
    return {
      org: {
        nombre: org.nombre,
        slug: org.slug,
        logo_url: org.portal_logo_url,
        primary_color: org.portal_primary_color,
        welcome_message: org.portal_welcome_message,
        order_label: org.portal_order_label,
        language: org.portal_language ?? 'es',
      },
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
      })),
    };
  }

  async createComplaint(orgSlug: string, dto: CreatePublicComplaintDto) {
    const org = await this.findPortalOrg(orgSlug);
    const category = await this.categoriesService
      .findOne(dto.category_id, org.id)
      .catch(() => {
        throw new BadRequestException('Categoría inválida');
      });

    const { ticket_id, tracking_token } =
      await this.ticketsService.createPublicComplaint({
        org_id: org.id,
        org_slug: org.slug,
        org_nombre: org.nombre,
        org_language: org.portal_language,
        customer_name: dto.customer_name,
        customer_email: dto.customer_email,
        customer_phone: dto.customer_phone,
        order_reference: dto.order_reference,
        category_id: category.id,
        category_name: category.name,
        description: dto.description,
        channel: TicketChannel.FORM,
      });

    return {
      complaint_id: ticket_id,
      short_id: ticket_id.slice(0, 8).toUpperCase(),
      tracking_token,
    };
  }

  /** Crea un reclamo desde un email entrante. Usa la categoría "other" como fallback. */
  async createComplaintFromEmail(
    orgSlug: string,
    data: { customer_name: string; customer_email: string; description: string },
  ) {
    const org = await this.findPortalOrg(orgSlug);
    const categories = await this.categoriesService.findAll(org.id, true);
    const fallback =
      categories.find((c) => c.slug === 'other') ?? categories[0];
    if (!fallback) {
      throw new BadRequestException('La organización no tiene categorías configuradas');
    }

    const { ticket_id, tracking_token } =
      await this.ticketsService.createPublicComplaint({
        org_id: org.id,
        org_slug: org.slug,
        org_nombre: org.nombre,
        org_language: org.portal_language,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        category_id: fallback.id,
        category_name: fallback.name,
        description: data.description,
        channel: TicketChannel.EMAIL,
      });

    return {
      complaint_id: ticket_id,
      short_id: ticket_id.slice(0, 8).toUpperCase(),
      tracking_token,
    };
  }

  /** Estado del reclamo para la página de seguimiento (datos mínimos, sin info interna). */
  async trackComplaint(token: string) {
    const ticket = await this.ticketsService.findByTrackingToken(token);
    const org = await this.organizationsService.findById(ticket.org_id);

    return {
      short_id: ticket.id.slice(0, 8).toUpperCase(),
      asunto: ticket.asunto,
      estado: ticket.estado,
      created_at: ticket.created_at,
      agent_name: ticket.tecnico_asignado?.nombre ?? null,
      org: org
        ? {
            nombre: org.nombre,
            slug: org.slug,
            logo_url: org.portal_logo_url,
            primary_color: org.portal_primary_color,
            language: org.portal_language ?? 'es',
          }
        : null,
      timeline: (ticket.comments ?? []).map((c) => ({
        author_name: c.author_name,
        author_role: c.author_role,
        body: c.body,
        attachments: c.attachments ?? [],
        created_at: c.created_at,
      })),
    };
  }

  /** Registra el score CSAT del cliente vía token. */
  async submitCsat(token: string, score: number, comment?: string) {
    const ticket = await this.ticketsService.findByTrackingToken(token);
    await this.ticketsService.saveCsat(ticket.id, score, comment);
    return { ok: true };
  }

  async reply(token: string, body: string) {
    const comment = await this.ticketsService.addPublicReply(token, body);
    return {
      id: comment.id,
      body: comment.body,
      created_at: comment.created_at,
    };
  }

  private async findPortalOrg(orgSlug: string) {
    const org = await this.organizationsService.findBySlug(orgSlug);
    if (!org || !org.estado_activo || !org.portal_enabled) {
      throw new NotFoundException('Portal no disponible');
    }
    return org;
  }
}

import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { TicketsService } from '../tickets/tickets.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CategoriesService } from '../categories/categories.service';
import { TicketChannel } from '../tickets/entities/ticket.entity';

/**
 * Webhook de Twilio para mensajes entrantes de WhatsApp.
 * Twilio manda application/x-www-form-urlencoded:
 *   From=whatsapp:+5491155551234, To=whatsapp:+14155238886, Body=..., ProfileName=...
 * Configurar en Twilio Console: POST <backend>/api/inbound/whatsapp
 * Nota: validación de firma Twilio (X-Twilio-Signature) pendiente para producción.
 */
@ApiTags('Inbound (webhooks)')
@Controller('inbound')
export class WhatsappInboundController {
  private readonly logger = new Logger(WhatsappInboundController.name);

  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly ticketsService: TicketsService,
    private readonly organizationsService: OrganizationsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @ApiOperation({ summary: 'Twilio WhatsApp inbound webhook' })
  @Post('whatsapp')
  async receiveWhatsapp(
    @Body() payload: { From?: string; To?: string; Body?: string; ProfileName?: string },
  ): Promise<string> {
    const customerPhone = payload.From?.replace('whatsapp:', '');
    const orgPhone = payload.To?.replace('whatsapp:', '');
    const body = payload.Body?.trim();

    // Twilio espera TwiML; respondemos vacío para no enviar auto-reply
    const emptyTwiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

    if (!customerPhone || !orgPhone || !body) return emptyTwiml;

    const orgId = await this.integrationsService.findOrgByWhatsappNumber(orgPhone);
    if (!orgId) {
      this.logger.warn(`WhatsApp to unknown number ${orgPhone} — ignoring`);
      return emptyTwiml;
    }

    // Si el cliente ya tiene un reclamo abierto, el mensaje es una respuesta
    const openTicket = await this.ticketsService.findOpenByCustomerPhone(orgId, customerPhone);
    if (openTicket) {
      await this.ticketsService.addPublicReply(openTicket.tracking_token, body);
      this.logger.log(`WhatsApp reply appended to ticket ${openTicket.id}`);
      return emptyTwiml;
    }

    // Reclamo nuevo
    const org = await this.organizationsService.findById(orgId);
    if (!org) return emptyTwiml;
    const categories = await this.categoriesService.findAll(orgId, true);
    const fallback = categories.find((c) => c.slug === 'other') ?? categories[0];
    if (!fallback) return emptyTwiml;

    const result = await this.ticketsService.createPublicComplaint({
      org_id: orgId,
      org_slug: org.slug,
      org_nombre: org.nombre,
      org_language: org.portal_language,
      customer_name: payload.ProfileName ?? customerPhone,
      customer_email: '', // WhatsApp puro: sin email; confirmación va por WhatsApp
      customer_phone: customerPhone,
      category_id: fallback.id,
      category_name: fallback.name,
      description: body,
      channel: TicketChannel.WHATSAPP,
    });

    this.logger.log(`WhatsApp complaint created ${result.ticket_id} for org ${orgId}`);
    return emptyTwiml;
  }
}

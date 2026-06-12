import { Body, Controller, Get, Logger, Post, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { IntegrationsService } from './integrations.service';
import { TicketsService } from '../tickets/tickets.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CategoriesService } from '../categories/categories.service';
import { TicketChannel } from '../tickets/entities/ticket.entity';

/**
 * Webhook de Meta WhatsApp Cloud API.
 *
 * GET  /inbound/whatsapp  — verificación del webhook (Meta llama esto al configurarlo)
 * POST /inbound/whatsapp  — mensajes entrantes en formato JSON de Meta
 *
 * Env vars:
 *   WHATSAPP_VERIFY_TOKEN  — token que elegís vos, se pega igual en Meta Developer Console
 *   WHATSAPP_ACCESS_TOKEN  — token de acceso permanente de la app de Meta
 *   WHATSAPP_PHONE_NUMBER_ID — ID del número en Meta (no el número en sí)
 */
@ApiTags('Inbound (webhooks)')
@Controller('inbound')
export class WhatsappInboundController {
  private readonly logger = new Logger(WhatsappInboundController.name);
  private readonly verifyToken: string;

  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly ticketsService: TicketsService,
    private readonly organizationsService: OrganizationsService,
    private readonly categoriesService: CategoriesService,
    config: ConfigService,
  ) {
    this.verifyToken = config.get<string>('WHATSAPP_VERIFY_TOKEN') ?? 'helpdesk-verify';
  }

  /** Meta llama este endpoint al guardar el webhook en Developer Console */
  @ApiOperation({ summary: 'Meta webhook verification' })
  @Get('whatsapp')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('WhatsApp webhook verified');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  @ApiOperation({ summary: 'Meta WhatsApp Cloud API inbound webhook' })
  @Post('whatsapp')
  async receiveWhatsapp(@Body() payload: any): Promise<{ status: string }> {
    // Meta espera siempre 200 rápido
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    if (!change?.messages?.length) return { status: 'ok' };

    const message = change.messages[0];
    if (message.type !== 'text') return { status: 'ok' }; // ignorar media por ahora

    const customerPhone = message.from; // ej: "5491155551234" (sin +)
    const phoneNumberId: string = change.metadata?.phone_number_id;
    const body: string = message.text?.body?.trim();
    const profileName: string = change.contacts?.[0]?.profile?.name ?? customerPhone;

    if (!customerPhone || !phoneNumberId || !body) return { status: 'ok' };

    // Buscar org por phone_number_id (guardado en integration.config)
    const orgId = await this.integrationsService.findOrgByWhatsappNumber(phoneNumberId);
    if (!orgId) {
      this.logger.warn(`WhatsApp from unknown phone_number_id ${phoneNumberId} — ignoring`);
      return { status: 'ok' };
    }

    // Si el cliente ya tiene reclamo abierto → reply al hilo
    const openTicket = await this.ticketsService.findOpenByCustomerPhone(orgId, customerPhone);
    if (openTicket) {
      await this.ticketsService.addPublicReply(openTicket.tracking_token, body);
      this.logger.log(`WhatsApp reply appended to ticket ${openTicket.id}`);
      return { status: 'ok' };
    }

    // Reclamo nuevo
    const org = await this.organizationsService.findById(orgId);
    if (!org) return { status: 'ok' };
    const categories = await this.categoriesService.findAll(orgId, true);
    const fallback = categories.find((c) => c.slug === 'other') ?? categories[0];
    if (!fallback) return { status: 'ok' };

    const result = await this.ticketsService.createPublicComplaint({
      org_id: orgId,
      org_slug: org.slug,
      org_nombre: org.nombre,
      org_language: org.portal_language,
      customer_name: profileName,
      customer_email: '',
      customer_phone: customerPhone,
      category_id: fallback.id,
      category_name: fallback.name,
      description: body,
      channel: TicketChannel.WHATSAPP,
    });

    this.logger.log(`WhatsApp complaint created ${result.ticket_id} for org ${orgId}`);
    return { status: 'ok' };
  }
}

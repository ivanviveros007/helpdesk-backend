import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';
import { PublicService } from './public.service';

/**
 * Webhook de email entrante (Resend Inbound / forwarding).
 * La dirección destino define la org: <org-slug>@inbound.<dominio>
 * Protegido con x-internal-secret — configurar el mismo secret en el webhook.
 */
@ApiTags('Inbound (webhooks)')
@ApiSecurity('internal-secret')
@Controller('inbound')
@UseGuards(InternalSecretGuard)
export class InboundEmailController {
  private readonly logger = new Logger(InboundEmailController.name);

  constructor(private readonly publicService: PublicService) {}

  @ApiOperation({ summary: 'Receive an inbound email and create a complaint' })
  @Post('email')
  async receiveEmail(
    @Body()
    payload: {
      from: { email: string; name?: string } | string;
      to: string | string[];
      subject?: string;
      text?: string;
      html?: string;
    },
  ) {
    const fromEmail =
      typeof payload.from === 'string' ? payload.from : payload.from?.email;
    const fromName =
      typeof payload.from === 'string'
        ? payload.from.split('@')[0]
        : (payload.from?.name ?? payload.from?.email?.split('@')[0]);

    const toAddress = Array.isArray(payload.to) ? payload.to[0] : payload.to;
    if (!fromEmail || !toAddress) {
      throw new BadRequestException('Missing from/to');
    }

    // <org-slug>@inbound.dominio → org-slug
    const orgSlug = toAddress.split('@')[0]?.toLowerCase();
    if (!orgSlug) throw new BadRequestException('Invalid destination address');

    const description = [
      payload.subject ? `Asunto: ${payload.subject}` : null,
      payload.text ?? this.stripHtml(payload.html ?? ''),
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 5000);

    if (description.trim().length < 10) {
      throw new BadRequestException('Email body too short');
    }

    const result = await this.publicService.createComplaintFromEmail(orgSlug, {
      customer_name: fromName ?? 'Cliente',
      customer_email: fromEmail,
      description,
    });

    this.logger.log(
      `Inbound email from ${fromEmail} → org ${orgSlug} → complaint ${result.complaint_id}`,
    );
    return result;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

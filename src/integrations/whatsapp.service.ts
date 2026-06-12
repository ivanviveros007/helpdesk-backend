import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Cliente saliente de WhatsApp vía Meta WhatsApp Cloud API.
 * Env vars: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 * Si no están configuradas, los envíos se loguean y se omiten (no-op).
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly accessToken?: string;
  private readonly phoneNumberId?: string;

  constructor(config: ConfigService) {
    this.accessToken = config.get<string>('WHATSAPP_ACCESS_TOKEN');
    this.phoneNumberId = config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
  }

  get isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  async sendMessage(toPhone: string, body: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`WhatsApp Cloud API not configured — skipping message to ${toPhone}`);
      return;
    }

    const url = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;
    try {
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: toPhone.replace(/^\+/, ''),
          type: 'text',
          text: { body },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`WhatsApp sent to ${toPhone}`);
    } catch (err: any) {
      this.logger.error(
        `WhatsApp send failed to ${toPhone}: ${err.response?.data?.error?.message ?? err.message}`,
      );
    }
  }
}

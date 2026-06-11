import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Cliente saliente de WhatsApp vía Twilio REST API (sin SDK).
 * Env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 * Si no están configuradas, los envíos se loguean y se omiten (no-op).
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly accountSid?: string;
  private readonly authToken?: string;
  private readonly from?: string;

  constructor(config: ConfigService) {
    this.accountSid = config.get<string>('TWILIO_ACCOUNT_SID');
    this.authToken = config.get<string>('TWILIO_AUTH_TOKEN');
    this.from = config.get<string>('TWILIO_WHATSAPP_FROM');
  }

  get isConfigured(): boolean {
    return !!(this.accountSid && this.authToken && this.from);
  }

  async sendMessage(toPhone: string, body: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`Twilio not configured — skipping WhatsApp to ${toPhone}`);
      return;
    }
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const params = new URLSearchParams({
      From: `whatsapp:${this.from}`,
      To: `whatsapp:${toPhone}`,
      Body: body,
    });
    try {
      await axios.post(url, params, {
        auth: { username: this.accountSid!, password: this.authToken! },
      });
      this.logger.log(`WhatsApp sent to ${toPhone}`);
    } catch (err: any) {
      this.logger.error(`WhatsApp send failed to ${toPhone}: ${err.message}`);
    }
  }
}

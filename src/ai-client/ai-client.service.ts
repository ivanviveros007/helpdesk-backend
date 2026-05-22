import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AiDecisionDto } from '../tickets/dto/ai-decision.dto';

interface AnalyzeTicketPayload {
  ticket_id: string;
  asunto: string;
  descripcion: string;
}

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async analyzeTicket(payload: AnalyzeTicketPayload): Promise<AiDecisionDto> {
    const url = `${this.config.get<string>('aiService.url')}/v1/analyze-ticket`;
    this.logger.log(`Sending ticket ${payload.ticket_id} to AI service`);

    const { data } = await firstValueFrom(
      this.http.post<AiDecisionDto>(url, payload),
    );

    return data;
  }
}

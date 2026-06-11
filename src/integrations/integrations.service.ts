import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import {
  IntegrationProvider,
  OrgIntegration,
} from './entities/org-integration.entity';

export interface IntegrationEvent {
  type: 'complaint.created' | 'complaint.resolved' | 'incident.created' | 'sla.breached';
  title: string;
  lines: string[]; // pares "Label: valor" ya formateados
  url?: string;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @InjectRepository(OrgIntegration)
    private readonly repo: Repository<OrgIntegration>,
  ) {}

  findAll(orgId: string): Promise<OrgIntegration[]> {
    return this.repo.find({ where: { org_id: orgId }, order: { provider: 'ASC' } });
  }

  async upsert(
    orgId: string,
    provider: IntegrationProvider,
    config: Record<string, string>,
    events?: string[],
  ): Promise<OrgIntegration> {
    let integration = await this.repo.findOneBy({ org_id: orgId, provider });
    if (integration) {
      integration.config = config;
      if (events) integration.events = events;
      integration.is_active = true;
    } else {
      integration = this.repo.create({
        org_id: orgId,
        provider,
        config,
        ...(events ? { events } : {}),
      });
    }
    return this.repo.save(integration);
  }

  async setActive(id: string, orgId: string, active: boolean): Promise<OrgIntegration> {
    const integration = await this.repo.findOneBy({ id, org_id: orgId });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);
    integration.is_active = active;
    return this.repo.save(integration);
  }

  async remove(id: string, orgId: string): Promise<void> {
    const integration = await this.repo.findOneBy({ id, org_id: orgId });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);
    await this.repo.remove(integration);
  }

  /** Busca la org dueña de un número de WhatsApp (webhook inbound de Twilio). */
  async findOrgByWhatsappNumber(phoneNumber: string): Promise<string | null> {
    const integration = await this.repo
      .createQueryBuilder('i')
      .where('i.provider = :p', { p: 'whatsapp' })
      .andWhere('i.is_active = true')
      .andWhere("i.config->>'phone_number' = :phone", { phone: phoneNumber })
      .getOne();
    return integration?.org_id ?? null;
  }

  /** Dispara el evento a todas las integraciones activas de la org. Fire-and-forget. */
  notify(orgId: string, event: IntegrationEvent): void {
    void this.repo
      .find({ where: { org_id: orgId, is_active: true } })
      .then((integrations) => {
        for (const integration of integrations) {
          if (!integration.events.includes(event.type)) continue;
          if (integration.provider === 'slack') this.sendSlack(integration, event);
          if (integration.provider === 'teams') this.sendTeams(integration, event);
        }
      })
      .catch((err) => this.logger.error(`notify failed for org ${orgId}`, err));
  }

  private sendSlack(integration: OrgIntegration, event: IntegrationEvent): void {
    const url = integration.config.webhook_url;
    if (!url) return;
    const text = [`*${event.title}*`, ...event.lines, event.url ?? '']
      .filter(Boolean)
      .join('\n');
    axios
      .post(url, { text })
      .catch((err) =>
        this.logger.error(`Slack webhook failed (org ${integration.org_id}): ${err.message}`),
      );
  }

  private sendTeams(integration: OrgIntegration, event: IntegrationEvent): void {
    const url = integration.config.webhook_url;
    if (!url) return;
    axios
      .post(url, {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        summary: event.title,
        themeColor: '2F6FED',
        title: event.title,
        text: event.lines.join('<br>') + (event.url ? `<br><a href="${event.url}">Ver reclamo</a>` : ''),
      })
      .catch((err) =>
        this.logger.error(`Teams webhook failed (org ${integration.org_id}): ${err.message}`),
      );
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Macro, MacroAction } from './entities/macro.entity';

@Injectable()
export class MacrosService {
  constructor(
    @InjectRepository(Macro)
    private readonly repo: Repository<Macro>,
  ) {}

  /** Macros visibles para un agente: compartidas + propias. */
  findAllForAgent(orgId: string, agentName: string): Promise<Macro[]> {
    return this.repo
      .createQueryBuilder('m')
      .where('m.org_id = :orgId', { orgId })
      .andWhere('(m.is_shared = true OR m.created_by = :agentName)', { agentName })
      .orderBy('m.name', 'ASC')
      .getMany();
  }

  async findOne(id: string, orgId: string): Promise<Macro> {
    const macro = await this.repo.findOneBy({ id, org_id: orgId });
    if (!macro) throw new NotFoundException(`Macro ${id} not found`);
    return macro;
  }

  create(
    data: { name: string; body: string; actions?: MacroAction[]; is_shared?: boolean },
    orgId: string,
    createdBy: string,
  ): Promise<Macro> {
    const macro = this.repo.create({
      ...data,
      actions: data.actions ?? [],
      org_id: orgId,
      created_by: createdBy,
    });
    return this.repo.save(macro);
  }

  async update(
    id: string,
    data: Partial<{ name: string; body: string; actions: MacroAction[]; is_shared: boolean }>,
    orgId: string,
  ): Promise<Macro> {
    const macro = await this.findOne(id, orgId);
    Object.assign(macro, data);
    return this.repo.save(macro);
  }

  async remove(id: string, orgId: string): Promise<void> {
    const macro = await this.findOne(id, orgId);
    await this.repo.remove(macro);
  }

  /** Reemplaza las variables {{x}} con datos del ticket. */
  renderBody(
    body: string,
    context: {
      customer_name?: string | null;
      ticket_id?: string;
      order_reference?: string | null;
      org_name?: string;
      agent_name?: string;
      tracking_url?: string | null;
      category_name?: string | null;
    },
  ): string {
    const vars: Record<string, string> = {
      customer_name: context.customer_name ?? 'cliente',
      ticket_id: context.ticket_id ? `#${context.ticket_id.slice(0, 8).toUpperCase()}` : '',
      order_reference: context.order_reference ?? '',
      org_name: context.org_name ?? '',
      agent_name: context.agent_name ?? '',
      tracking_url: context.tracking_url ?? '',
      category_name: context.category_name ?? '',
    };
    return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiUsageLog } from './entities/ai-usage-log.entity';
import { CreateAiUsageDto } from './dto/create-ai-usage.dto';

// Precios por millón de tokens (USD) — llama-3.3-70b-versatile en Groq
const PRICE_INPUT_PER_M = 0.59;
const PRICE_OUTPUT_PER_M = 0.79;

function calcCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * PRICE_INPUT_PER_M + (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M;
}

@Injectable()
export class AiUsageService {
  constructor(
    @InjectRepository(AiUsageLog)
    private readonly repo: Repository<AiUsageLog>,
  ) {}

  async record(dto: CreateAiUsageDto): Promise<void> {
    await this.repo.save(this.repo.create(dto));
  }

  async getByOrg(orgId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = await this.repo
      .createQueryBuilder('l')
      .select('SUM(l.input_tokens)', 'input_tokens')
      .addSelect('SUM(l.output_tokens)', 'output_tokens')
      .addSelect('COUNT(l.id)', 'requests')
      .where('l.org_id = :orgId AND l.created_at >= :start', { orgId, start: startOfMonth })
      .getRawOne<{ input_tokens: string; output_tokens: string; requests: string }>();

    const inputTokens = parseInt(rows?.input_tokens ?? '0', 10);
    const outputTokens = parseInt(rows?.output_tokens ?? '0', 10);
    const requests = parseInt(rows?.requests ?? '0', 10);
    const cost_usd = calcCost(inputTokens, outputTokens);

    return { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: inputTokens + outputTokens, requests, cost_usd: parseFloat(cost_usd.toFixed(4)), month: startOfMonth };
  }

  async getGlobal() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const total = await this.repo
      .createQueryBuilder('l')
      .select('SUM(l.input_tokens)', 'input_tokens')
      .addSelect('SUM(l.output_tokens)', 'output_tokens')
      .addSelect('COUNT(l.id)', 'requests')
      .where('l.created_at >= :start', { start: startOfMonth })
      .getRawOne<{ input_tokens: string; output_tokens: string; requests: string }>();

    const byOrg = await this.repo
      .createQueryBuilder('l')
      .select('l.org_id', 'org_id')
      .addSelect('SUM(l.input_tokens)', 'input_tokens')
      .addSelect('SUM(l.output_tokens)', 'output_tokens')
      .addSelect('COUNT(l.id)', 'requests')
      .where('l.created_at >= :start', { start: startOfMonth })
      .groupBy('l.org_id')
      .orderBy('SUM(l.input_tokens + l.output_tokens)', 'DESC')
      .getRawMany<{ org_id: string; input_tokens: string; output_tokens: string; requests: string }>();

    const inputTokens = parseInt(total?.input_tokens ?? '0', 10);
    const outputTokens = parseInt(total?.output_tokens ?? '0', 10);
    const requests = parseInt(total?.requests ?? '0', 10);

    return {
      month: startOfMonth,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      requests,
      cost_usd: parseFloat(calcCost(inputTokens, outputTokens).toFixed(4)),
      by_org: byOrg.map((r) => {
        const inp = parseInt(r.input_tokens, 10);
        const out = parseInt(r.output_tokens, 10);
        return {
          org_id: r.org_id,
          input_tokens: inp,
          output_tokens: out,
          total_tokens: inp + out,
          requests: parseInt(r.requests, 10),
          cost_usd: parseFloat(calcCost(inp, out).toFixed(4)),
        };
      }),
    };
  }
}

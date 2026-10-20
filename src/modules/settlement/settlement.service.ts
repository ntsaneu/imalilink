import { SettlementRepository } from './settlement.repository';
import { nettingEngine } from './netting.engine';
import { logger } from '../../config/logger';
import { SettlementInstruction, SettlementReport, ProviderSettlementSummary, RunNettingResult, SettlementStatus } from './settlement.types';
import { getOne, runQuery } from '../../config/database';

export class SettlementService {
  private repository: SettlementRepository;

  constructor() { this.repository = new SettlementRepository(); }

  async runNetting(settlementDate?: string): Promise<RunNettingResult> {
    return nettingEngine.runNetting({ settlementDate });
  }

  async getInstructions(settlementDate: string): Promise<SettlementInstruction[]> {
    return this.repository.getInstructions(settlementDate);
  }

  async confirmSettlement(settlementDate: string, fromProvider: string, toProvider: string, reference?: string): Promise<boolean> {
    const existing = await this.repository.findOne(settlementDate, fromProvider, toProvider);
    if (!existing) throw new Error(`Settlement not found: ${settlementDate} ${fromProvider} -> ${toProvider}`);
    await this.repository.updateStatus(settlementDate, fromProvider, toProvider, 'settled');
    logger.info(`[Settlement] Confirmed: ${fromProvider} -> ${toProvider} R${existing.net_amount} (ref: ${reference || 'N/A'})`);
    return true;
  }

  async generateReport(settlementDate: string): Promise<SettlementReport> {
    const instructions = await this.getInstructions(settlementDate);
    const totals = await this.repository.getTotalsForDate(settlementDate);
    const summaries = new Map<string, ProviderSettlementSummary>();

    for (const instruction of instructions) {
      if (!summaries.has(instruction.from_provider)) {
        summaries.set(instruction.from_provider, { provider_code: instruction.from_provider, provider_name: await this.getProviderName(instruction.from_provider), total_owed: 0, total_owed_to: 0, net_position: 0, currency: instruction.currency });
      }
      summaries.get(instruction.from_provider)!.total_owed += instruction.amount;

      if (!summaries.has(instruction.to_provider)) {
        summaries.set(instruction.to_provider, { provider_code: instruction.to_provider, provider_name: await this.getProviderName(instruction.to_provider), total_owed: 0, total_owed_to: 0, net_position: 0, currency: instruction.currency });
      }
      summaries.get(instruction.to_provider)!.total_owed_to += instruction.amount;
    }

    for (const s of summaries.values()) s.net_position = s.total_owed_to - s.total_owed;

    return {
      settlement_date: settlementDate,
      generated_at: new Date().toISOString(),
      total_pairs: totals.total_pairs,
      total_amount: totals.total_amount,
      currency: 'ZAR',
      instructions,
      provider_summaries: Array.from(summaries.values()),
    };
  }

  async getPendingSettlements(): Promise<SettlementInstruction[]> {
    const rows = await runQuery<any[]>(`SELECT * FROM settlement_netting WHERE status IN ('pending', 'instructed', 'in_transit') ORDER BY settlement_date DESC`);
    return rows.map((row) => ({
      settlement_id: `STL-${row.settlement_date}-${row.from_provider}-${row.to_provider}`,
      settlement_date: row.settlement_date,
      from_provider: row.from_provider,
      to_provider: row.to_provider,
      amount: row.net_amount,
      currency: row.currency,
      status: row.status as SettlementStatus,
      due_date: row.settlement_date,
      created_at: new Date().toISOString(),
      settled_at: row.settled_at,
    }));
  }

  async getProviderSettlements(providerCode: string, settlementDate: string): Promise<SettlementInstruction[]> {
    const rows = await this.repository.getProviderSettlements(providerCode, settlementDate);
    return rows.map((row) => ({
      settlement_id: `STL-${row.settlement_date}-${row.from_provider}-${row.to_provider}`,
      settlement_date: row.settlement_date,
      from_provider: row.from_provider,
      to_provider: row.to_provider,
      amount: row.net_amount,
      currency: row.currency,
      status: row.status as SettlementStatus,
      due_date: row.settlement_date,
      created_at: new Date().toISOString(),
      settled_at: row.settled_at,
    }));
  }

  private async getProviderName(providerCode: string): Promise<string> {
    const row = await getOne<{ provider_name: string }>(`SELECT provider_name FROM providers WHERE provider_code = ?`, [providerCode]);
    return row?.provider_name || providerCode;
  }
}

export const settlementService = new SettlementService();

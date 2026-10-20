import { SettlementRepository } from './settlement.repository';
import { NettingEngine, nettingEngine } from './netting.engine';
import { logger } from '../../config/logger';
import {
  SettlementInstruction,
  SettlementReport,
  ProviderSettlementSummary,
  RunNettingResult,
  SettlementStatus,
} from './settlement.types';
import { getOne, runQuery } from '../../config/database';

export class SettlementService {
  private repository: SettlementRepository;
  private netting: NettingEngine;

  constructor() {
    this.repository = new SettlementRepository();
    this.netting = nettingEngine;
  }

  /**
   * Run netting for a given date (or today).
   */
  async runNetting(settlementDate?: string): Promise<RunNettingResult> {
    return this.netting.runNetting({ settlementDate });
  }

  /**
   * Get all settlement instructions for a date.
   */
  async getInstructions(settlementDate: string): Promise<SettlementInstruction[]> {
    return this.repository.getInstructions(settlementDate);
  }

  /**
   * Get a single settlement instruction.
   */
  async getInstruction(
    settlementDate: string,
    fromProvider: string,
    toProvider: string
  ): Promise<SettlementInstruction | null> {
    const row = await this.repository.findOne(settlementDate, fromProvider, toProvider);
    if (!row) return null;

    return {
      settlement_id: `STL-${settlementDate}-${fromProvider}-${toProvider}`,
      settlement_date: row.settlement_date,
      from_provider: row.from_provider,
      to_provider: row.to_provider,
      amount: row.net_amount,
      currency: row.currency,
      status: row.status as SettlementStatus,
      due_date: this.nextBusinessDay(settlementDate),
      created_at: new Date().toISOString(),
      settled_at: row.settled_at,
    };
  }

  /**
   * Mark a settlement instruction as settled.
   * Called when the EFT confirmation is received.
   */
  async confirmSettlement(
    settlementDate: string,
    fromProvider: string,
    toProvider: string,
    reference?: string
  ): Promise<boolean> {
    const existing = await this.repository.findOne(
      settlementDate,
      fromProvider,
      toProvider
    );

    if (!existing) {
      throw new Error(
        `Settlement not found: ${settlementDate} ${fromProvider} → ${toProvider}`
      );
    }

    if (existing.status === 'settled') {
      logger.warn(
        `Settlement already confirmed: ${settlementDate} ${fromProvider} → ${toProvider}`
      );
      return true;
    }

    await this.repository.updateStatus(
      settlementDate,
      fromProvider,
      toProvider,
      'settled'
    );

    logger.info(
      `[Settlement] Confirmed: ${fromProvider} → ${toProvider} R${existing.net_amount} (ref: ${reference || 'N/A'})`
    );

    return true;
  }

  /**
   * Mark a settlement instruction as in transit (EFT initiated).
   */
  async markInTransit(
    settlementDate: string,
    fromProvider: string,
    toProvider: string
  ): Promise<void> {
    await this.repository.updateStatus(
      settlementDate,
      fromProvider,
      toProvider,
      'in_transit'
    );

    logger.info(`[Settlement] In transit: ${fromProvider} → ${toProvider}`);
  }

  /**
   * Mark a settlement instruction as failed.
   */
  async markFailed(
    settlementDate: string,
    fromProvider: string,
    toProvider: string,
    reason: string
  ): Promise<void> {
    await this.repository.updateStatus(
      settlementDate,
      fromProvider,
      toProvider,
      'failed'
    );

    logger.error(
      `[Settlement] Failed: ${fromProvider} → ${toProvider}. Reason: ${reason}`
    );
  }

  /**
   * Generate a full settlement report for a date.
   */
  async generateReport(settlementDate: string): Promise<SettlementReport> {
    const instructions = await this.getInstructions(settlementDate);
    const netPositions = await this.repository.getNetPositions(settlementDate);
    const totals = await this.repository.getTotalsForDate(settlementDate);

    // Build provider summaries
    const summaries = new Map<string, ProviderSettlementSummary>();

    for (const instruction of instructions) {
      // Debtor
      if (!summaries.has(instruction.from_provider)) {
        summaries.set(instruction.from_provider, {
          provider_code: instruction.from_provider,
          provider_name: await this.getProviderName(instruction.from_provider),
          total_owed: 0,
          total_owed_to: 0,
          net_position: 0,
          currency: instruction.currency,
        });
      }
      const debtor = summaries.get(instruction.from_provider)!;
      debtor.total_owed += instruction.amount;

      // Creditor
      if (!summaries.has(instruction.to_provider)) {
        summaries.set(instruction.to_provider, {
          provider_code: instruction.to_provider,
          provider_name: await this.getProviderName(instruction.to_provider),
          total_owed: 0,
          total_owed_to: 0,
          net_position: 0,
          currency: instruction.currency,
        });
      }
      const creditor = summaries.get(instruction.to_provider)!;
      creditor.total_owed_to += instruction.amount;
    }

    // Compute net positions
    for (const summary of summaries.values()) {
      summary.net_position = summary.total_owed_to - summary.total_owed;
    }

    return {
      settlement_date: settlementDate,
      generated_at: new Date().toISOString(),
      total_pairs: totals.total_pairs,
      total_amount: totals.total_amount,
      currency: 'ZAR',
      instructions,
      net_positions: netPositions.map((r: any) => ({
        settlement_date: r.settlement_date,
        from_provider: r.from_provider,
        to_provider: r.to_provider,
        total_sent: r.net_amount,
        total_received: 0,
        net_amount: r.net_amount,
        currency: r.currency,
        transaction_count: 0,
      })),
      provider_summaries: Array.from(summaries.values()),
    };
  }

  /**
   * Get settlements for a specific provider.
   */
  async getProviderSettlements(
    providerCode: string,
    settlementDate: string
  ): Promise<SettlementInstruction[]> {
    const rows = await this.repository.getProviderSettlements(
      providerCode,
      settlementDate
    );

    return rows.map((row) => ({
      settlement_id: `STL-${row.settlement_date}-${row.from_provider}-${row.to_provider}`,
      settlement_date: row.settlement_date,
      from_provider: row.from_provider,
      to_provider: row.to_provider,
      amount: row.net_amount,
      currency: row.currency,
      status: row.status as SettlementStatus,
      due_date: this.nextBusinessDay(row.settlement_date),
      created_at: new Date().toISOString(),
      settled_at: row.settled_at,
    }));
  }

  /**
   * Get all pending settlements (across all dates).
   */
  async getPendingSettlements(): Promise<SettlementInstruction[]> {
    const rows = await runQuery<any[]>(
      `SELECT * FROM settlement_netting
       WHERE status IN ('pending', 'instructed', 'in_transit')
       ORDER BY settlement_date DESC, from_provider, to_provider`
    );

    return rows.map((row) => ({
      settlement_id: `STL-${row.settlement_date}-${row.from_provider}-${row.to_provider}`,
      settlement_date: row.settlement_date,
      from_provider: row.from_provider,
      to_provider: row.to_provider,
      amount: row.net_amount,
      currency: row.currency,
      status: row.status as SettlementStatus,
      due_date: this.nextBusinessDay(row.settlement_date),
      created_at: new Date().toISOString(),
      settled_at: row.settled_at,
    }));
  }

  /**
   * Run the full settlement cycle (netting + reporting).
   */
  async runFullCycle(settlementDate?: string): Promise<{
    netting: RunNettingResult;
    report: SettlementReport;
  }> {
    const netting = await this.runNetting(settlementDate);
    const report = await this.generateReport(netting.settlement_date);

    logger.info(
      `[Settlement] Full cycle complete for ${netting.settlement_date}: ${netting.pairs_netting} pairs, R${netting.total_volume.toFixed(2)}`
    );

    return { netting, report };
  }

  /**
   * Helper: get provider name.
   */
  private async getProviderName(providerCode: string): Promise<string> {
    const row = await getOne<{ provider_name: string }>(
      `SELECT provider_name FROM providers WHERE provider_code = ?`,
      [providerCode]
    );
    return row?.provider_name || providerCode;
  }

  /**
   * Compute next business day.
   */
  private nextBusinessDay(dateStr: string): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    return date.toISOString().split('T')[0];
  }
}

export const settlementService = new SettlementService();
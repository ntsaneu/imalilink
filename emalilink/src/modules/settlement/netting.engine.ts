import { SettlementRepository } from './settlement.repository';
import { logger } from '../../config/logger';
import {
  NetPosition,
  RunNettingResult,
  NettingEngineOptions,
} from './settlement.types';

/**
 * Netting Engine
 *
 * Runs daily at 23:59. Aggregates all completed transactions for the day,
 * groups them by provider pair, calculates net positions, and stores them
 * in the settlement_netting table.
 *
 * Core algorithm:
 *   1. Query all completed transactions for the settlement date.
 *   2. Group by (from_provider, to_provider) — direction matters.
 *   3. For each pair, calculate total sent + total received.
 *   4. Compute net = sent - received.
 *   5. If net > 0, from_provider owes to_provider the net amount.
 *   6. Persist net positions.
 */
export class NettingEngine {
  private repository: SettlementRepository;

  constructor() {
    this.repository = new SettlementRepository();
  }

  /**
   * Run the netting process for a given date.
   */
  async runNetting(options: NettingEngineOptions = {}): Promise<RunNettingResult> {
    const startTime = Date.now();
    const settlementDate = options.settlementDate || this.today();
    const minNetAmount = options.minNetAmount ?? 0;
    const currency = options.currency || 'ZAR';

    logger.info(`[Netting] Starting netting for ${settlementDate}`);

    // Step 1: Fetch all completed transactions for the day
    const transactions = await this.repository.getTransactionsForDate(settlementDate);

    logger.info(`[Netting] Found ${transactions.length} completed transactions`);

    if (transactions.length === 0) {
      logger.info(`[Netting] No transactions to net for ${settlementDate}`);
      return {
        settlement_date: settlementDate,
        providers_processed: 0,
        pairs_netting: 0,
        instructions_generated: 0,
        total_volume: 0,
        duration_ms: Date.now() - startTime,
      };
    }

    // Step 2: Build an aggregation map
    // Key: "from_provider|to_provider" → { sent, received, count, currency }
    const pairs = new Map<
      string,
      {
        from: string;
        to: string;
        sent: number;
        received: number;
        count: number;
        currency: string;
      }
    >();

    for (const tx of transactions) {
      const from = tx.sender_provider;
      const to = tx.recipient_provider;
      const amount = Number(tx.amount);

      if (from === to) continue; // Skip self-transfers

      // Direction A → B: from owes to (increases sent)
      const keyAB = `${from}|${to}`;
      if (!pairs.has(keyAB)) {
        pairs.set(keyAB, {
          from,
          to,
          sent: 0,
          received: 0,
          count: 0,
          currency: tx.currency || currency,
        });
      }
      const ab = pairs.get(keyAB)!;
      ab.sent += amount;
      ab.count += 1;

      // Direction B → A: increases received for A
      const keyBA = `${to}|${from}`;
      if (!pairs.has(keyBA)) {
        pairs.set(keyBA, {
          from: to,
          to: from,
          sent: 0,
          received: 0,
          count: 0,
          currency: tx.currency || currency,
        });
      }
      const ba = pairs.get(keyBA)!;
      ba.received += amount;
    }

    // Step 3: Consolidate bidirectional pairs into net positions
    // Use a seen set to avoid double-processing A→B and B→A.
    const seen = new Set<string>();
    const netPositions: NetPosition[] = [];
    const providerSet = new Set<string>();
    let totalVolume = 0;

    for (const [key, pair] of pairs.entries()) {
      const [a, b] = key.split('|');

      // Canonical pair key: alphabetical order
      const canonical = [a, b].sort().join('|');
      if (seen.has(canonical)) continue;
      seen.add(canonical);

      // Get both directions
      const ab = pairs.get(`${a}|${b}`);
      const ba = pairs.get(`${b}|${a}`);

      const aToB = ab?.sent || 0;
      const bToA = ba?.sent || 0;

      const net = aToB - bToA;

      if (Math.abs(net) < minNetAmount) continue;

      // Net > 0 means A owes B the net amount
      const netPosition: NetPosition = net > 0
        ? {
            settlement_date: settlementDate,
            from_provider: a,
            to_provider: b,
            total_sent: aToB,
            total_received: bToA,
            net_amount: net,
            currency: ab?.currency || currency,
            transaction_count: (ab?.count || 0) + (ba?.count || 0),
          }
        : {
            settlement_date: settlementDate,
            from_provider: b,
            to_provider: a,
            total_sent: bToA,
            total_received: aToB,
            net_amount: -net,
            currency: ba?.currency || currency,
            transaction_count: (ab?.count || 0) + (ba?.count || 0),
          };

      netPositions.push(netPosition);
      providerSet.add(a);
      providerSet.add(b);
      totalVolume += Math.abs(net);
    }

    // Step 4: Persist net positions
    for (const position of netPositions) {
      await this.repository.upsertNetPosition(position);
    }

    logger.info(
      `[Netting] ${netPositions.length} net positions calculated across ${providerSet.size} providers`
    );

    const duration = Date.now() - startTime;

    logger.info(
      `[Netting] Completed for ${settlementDate} in ${duration}ms — total volume R${totalVolume.toFixed(2)}`
    );

    return {
      settlement_date: settlementDate,
      providers_processed: providerSet.size,
      pairs_netting: netPositions.length,
      instructions_generated: netPositions.length,
      total_volume: totalVolume,
      duration_ms: duration,
    };
  }

  /**
   * Re-run netting for a specific date (e.g., correction).
   * Deletes pending rows and recalculates.
   */
  async rerunNetting(settlementDate: string): Promise<RunNettingResult> {
    logger.warn(`[Netting] Re-running netting for ${settlementDate}`);

    await this.repository.deleteForDate(settlementDate);

    return this.runNetting({ settlementDate });
  }

  /**
   * Get the last N settlement dates that have been processed.
   */
  async getRecentSettlementDates(limit: number = 10): Promise<string[]> {
    return this.repository.listSettlementDates(limit);
  }

  /**
   * Returns today's date in YYYY-MM-DD format (server local time).
   */
  private today(): string {
    return new Date().toISOString().split('T')[0];
  }
}

// Singleton for use in scheduler
export const nettingEngine = new NettingEngine();
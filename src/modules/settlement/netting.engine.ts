import { SettlementRepository } from './settlement.repository';
import { logger } from '../../config/logger';
import { NetPosition, RunNettingResult, NettingEngineOptions } from './settlement.types';

export class NettingEngine {
  private repository: SettlementRepository;

  constructor() { this.repository = new SettlementRepository(); }

  async runNetting(options: NettingEngineOptions = {}): Promise<RunNettingResult> {
    const startTime = Date.now();
    const settlementDate = options.settlementDate || new Date().toISOString().split('T')[0];
    const minNetAmount = options.minNetAmount ?? 0;
    const currency = options.currency || 'ZAR';

    logger.info(`[Netting] Starting netting for ${settlementDate}`);

    const transactions = await this.repository.getTransactionsForDate(settlementDate);
    logger.info(`[Netting] Found ${transactions.length} completed transactions`);

    if (transactions.length === 0) {
      return { settlement_date: settlementDate, providers_processed: 0, pairs_netting: 0, instructions_generated: 0, total_volume: 0, duration_ms: Date.now() - startTime };
    }

    const pairs = new Map<string, { from: string; to: string; sent: number; received: number; count: number; currency: string }>();

    for (const tx of transactions) {
      const from = tx.sender_provider;
      const to = tx.recipient_provider;
      const amount = Number(tx.amount);
      if (from === to) continue;

      const keyAB = `${from}|${to}`;
      if (!pairs.has(keyAB)) pairs.set(keyAB, { from, to, sent: 0, received: 0, count: 0, currency: tx.currency || currency });
      const ab = pairs.get(keyAB)!;
      ab.sent += amount;
      ab.count += 1;

      const keyBA = `${to}|${from}`;
      if (!pairs.has(keyBA)) pairs.set(keyBA, { from: to, to: from, sent: 0, received: 0, count: 0, currency: tx.currency || currency });
      const ba = pairs.get(keyBA)!;
      ba.received += amount;
    }

    const seen = new Set<string>();
    const netPositions: NetPosition[] = [];
    const providerSet = new Set<string>();
    let totalVolume = 0;

    for (const [key] of pairs.entries()) {
      const [a, b] = key.split('|');
      const canonical = [a, b].sort().join('|');
      if (seen.has(canonical)) continue;
      seen.add(canonical);

      const aToB = pairs.get(`${a}|${b}`)?.sent || 0;
      const bToA = pairs.get(`${b}|${a}`)?.sent || 0;
      const net = aToB - bToA;
      if (Math.abs(net) < minNetAmount) continue;

      const netPosition: NetPosition = net > 0
        ? { settlement_date: settlementDate, from_provider: a, to_provider: b, total_sent: aToB, total_received: bToA, net_amount: net, currency, transaction_count: (pairs.get(`${a}|${b}`)?.count || 0) + (pairs.get(`${b}|${a}`)?.count || 0) }
        : { settlement_date: settlementDate, from_provider: b, to_provider: a, total_sent: bToA, total_received: aToB, net_amount: -net, currency, transaction_count: (pairs.get(`${a}|${b}`)?.count || 0) + (pairs.get(`${b}|${a}`)?.count || 0) };

      netPositions.push(netPosition);
      providerSet.add(a);
      providerSet.add(b);
      totalVolume += Math.abs(net);
    }

    for (const position of netPositions) await this.repository.upsertNetPosition(position);

    const duration = Date.now() - startTime;
    logger.info(`[Netting] Completed for ${settlementDate} in ${duration}ms — total volume R${totalVolume.toFixed(2)}`);

    return {
      settlement_date: settlementDate,
      providers_processed: providerSet.size,
      pairs_netting: netPositions.length,
      instructions_generated: netPositions.length,
      total_volume: totalVolume,
      duration_ms: duration,
    };
  }

  async rerunNetting(settlementDate: string): Promise<RunNettingResult> {
    await this.repository.deleteForDate(settlementDate);
    return this.runNetting({ settlementDate });
  }
}

export const nettingEngine = new NettingEngine();

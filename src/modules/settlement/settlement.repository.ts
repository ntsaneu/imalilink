import { runQuery, runMutation, getOne } from '../../config/database';
import { NetPosition, SettlementInstruction, SettlementStatus } from './settlement.types';

export class SettlementRepository {
  async getTransactionsForDate(date: string): Promise<any[]> {
    return runQuery<any[]>(
      `SELECT transaction_id, sender_provider, sender_wallet_id, recipient_provider, recipient_wallet_id, amount, currency, status, routed_at
       FROM transactions WHERE DATE(routed_at) = ? AND status = 'completed'`,
      [date]
    );
  }

  async upsertNetPosition(position: NetPosition): Promise<void> {
    await runMutation(
      `INSERT INTO settlement_netting (settlement_date, from_provider, to_provider, net_amount, currency, status)
       VALUES (?, ?, ?, ?, ?, 'pending')
       ON CONFLICT(settlement_date, from_provider, to_provider)
       DO UPDATE SET net_amount = excluded.net_amount, currency = excluded.currency, status = 'pending'`,
      [position.settlement_date, position.from_provider, position.to_provider, position.net_amount, position.currency]
    );
  }

  async getNetPositions(date: string): Promise<any[]> {
    return runQuery<any[]>(
      `SELECT settlement_date, from_provider, to_provider, net_amount, currency, status
       FROM settlement_netting WHERE settlement_date = ? AND net_amount > 0
       ORDER BY from_provider, to_provider`,
      [date]
    );
  }

  async getInstructions(date: string): Promise<SettlementInstruction[]> {
    const rows = await runQuery<any[]>(
      `SELECT settlement_date, from_provider, to_provider, net_amount AS amount, currency, status, settled_at
       FROM settlement_netting WHERE settlement_date = ? ORDER BY from_provider, to_provider`,
      [date]
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

  async updateStatus(date: string, fromProvider: string, toProvider: string, status: SettlementStatus): Promise<void> {
    const settledAt = status === 'settled' ? new Date().toISOString() : null;
    await runMutation(
      `UPDATE settlement_netting SET status = ?, settled_at = COALESCE(?, settled_at)
       WHERE settlement_date = ? AND from_provider = ? AND to_provider = ?`,
      [status, settledAt, date, fromProvider, toProvider]
    );
  }

  async findOne(date: string, fromProvider: string, toProvider: string): Promise<any> {
    return getOne(
      `SELECT * FROM settlement_netting WHERE settlement_date = ? AND from_provider = ? AND to_provider = ?`,
      [date, fromProvider, toProvider]
    );
  }

  async getProviderSettlements(providerCode: string, date: string): Promise<any[]> {
    return runQuery<any[]>(
      `SELECT * FROM settlement_netting WHERE settlement_date = ? AND (from_provider = ? OR to_provider = ?)
       ORDER BY from_provider, to_provider`,
      [date, providerCode, providerCode]
    );
  }

  async getTotalsForDate(date: string): Promise<{ total_amount: number; total_pairs: number }> {
    const row = await getOne<{ total: number; count: number }>(
      `SELECT COALESCE(SUM(net_amount), 0) as total, COUNT(*) as count FROM settlement_netting WHERE settlement_date = ?`,
      [date]
    );
    return { total_amount: row?.total || 0, total_pairs: row?.count || 0 };
  }

  async deleteForDate(date: string): Promise<void> {
    await runMutation(`DELETE FROM settlement_netting WHERE settlement_date = ? AND status = 'pending'`, [date]);
  }

  async listSettlementDates(limit: number = 30): Promise<string[]> {
    const rows = await runQuery<{ settlement_date: string }[]>(
      `SELECT DISTINCT settlement_date FROM settlement_netting ORDER BY settlement_date DESC LIMIT ?`,
      [limit]
    );
    return rows.map((r) => r.settlement_date);
  }

  private nextBusinessDay(dateStr: string): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }
}

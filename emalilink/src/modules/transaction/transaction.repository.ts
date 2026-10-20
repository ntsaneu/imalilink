import { runMutation, getOne } from '../../config/database';

export class TransactionRepository {
  async create(tx: {
    transaction_id: string;
    sender_provider: string;
    sender_wallet_id: string;
    recipient_phone: string;
    recipient_provider: string;
    recipient_wallet_id: string;
    amount: number;
    currency: string;
    idempotency_key: string;
    status: string;
  }): Promise<void> {
    await runMutation(
      `INSERT INTO transactions (
        transaction_id, sender_provider, sender_wallet_id,
        recipient_phone, recipient_provider, recipient_wallet_id,
        amount, currency, idempotency_key, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.transaction_id,
        tx.sender_provider,
        tx.sender_wallet_id,
        tx.recipient_phone,
        tx.recipient_provider,
        tx.recipient_wallet_id,
        tx.amount,
        tx.currency,
        tx.idempotency_key,
        tx.status,
      ]
    );
  }

  async updateStatus(transactionId: string, status: string, errorMessage?: string): Promise<void> {
    await runMutation(
      `UPDATE transactions SET status = ?, error_message = ? WHERE transaction_id = ?`,
      [status, errorMessage || null, transactionId]
    );
  }

  async findById(transactionId: string): Promise<any> {
    return getOne(`SELECT * FROM transactions WHERE transaction_id = ?`, [transactionId]);
  }

  async createLedgerEntry(entry: {
    transaction_id: string;
    provider_code: string;
    wallet_id: string;
    direction: 'debit' | 'credit';
    amount: number;
    currency: string;
  }): Promise<void> {
    await runMutation(
      `INSERT INTO ledger_entries (transaction_id, provider_code, wallet_id, direction, amount, currency)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        entry.transaction_id,
        entry.provider_code,
        entry.wallet_id,
        entry.direction,
        entry.amount,
        entry.currency,
      ]
    );
  }
}
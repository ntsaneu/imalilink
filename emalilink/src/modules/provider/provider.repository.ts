import { runQuery, runMutation, getOne } from '../../config/database';
import { Provider, ProviderStats } from './provider.types';

export class ProviderRepository {
  /**
   * Find a provider by its code.
   */
  async findByCode(providerCode: string): Promise<Provider | undefined> {
    return getOne<Provider>(
      `SELECT * FROM providers WHERE provider_code = ?`,
      [providerCode]
    );
  }

  /**
   * Find all providers, optionally filtered by status or type.
   */
  async findAll(filters?: {
    status?: string;
    type?: string;
  }): Promise<Provider[]> {
    let sql = `SELECT * FROM providers WHERE 1=1`;
    const params: any[] = [];

    if (filters?.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }

    if (filters?.type) {
      sql += ` AND provider_type = ?`;
      params.push(filters.type);
    }

    sql += ` ORDER BY provider_name ASC`;

    return runQuery<Provider[]>(sql, params);
  }

  /**
   * Find all active providers.
   */
  async findActive(): Promise<Provider[]> {
    return runQuery<Provider[]>(
      `SELECT * FROM providers WHERE status = 'active' ORDER BY provider_name ASC`
    );
  }

  /**
   * Find all providers with sandbox status.
   */
  async findSandbox(): Promise<Provider[]> {
    return runQuery<Provider[]>(
      `SELECT * FROM providers WHERE status = 'sandbox' ORDER BY provider_name ASC`
    );
  }

  /**
   * Create a new provider.
   */
  async create(provider: {
    provider_code: string;
    provider_name: string;
    provider_type: string;
    api_endpoint?: string;
    webhook_url?: string;
    status?: string;
  }): Promise<void> {
    await runMutation(
      `INSERT INTO providers 
        (provider_code, provider_name, provider_type, api_endpoint, webhook_url, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        provider.provider_code,
        provider.provider_name,
        provider.provider_type,
        provider.api_endpoint || null,
        provider.webhook_url || null,
        provider.status || 'active',
      ]
    );
  }

  /**
   * Update an existing provider.
   */
  async update(
    providerCode: string,
    updates: {
      provider_name?: string;
      api_endpoint?: string;
      webhook_url?: string;
      status?: string;
    }
  ): Promise<boolean> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.provider_name !== undefined) {
      fields.push('provider_name = ?');
      params.push(updates.provider_name);
    }
    if (updates.api_endpoint !== undefined) {
      fields.push('api_endpoint = ?');
      params.push(updates.api_endpoint);
    }
    if (updates.webhook_url !== undefined) {
      fields.push('webhook_url = ?');
      params.push(updates.webhook_url);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(providerCode);

    const result = await runMutation(
      `UPDATE providers SET ${fields.join(', ')} WHERE provider_code = ?`,
      params
    );

    return result.changes > 0;
  }

  /**
   * Delete a provider (soft delete — sets status to inactive).
   */
  async delete(providerCode: string): Promise<boolean> {
    const result = await runMutation(
      `UPDATE providers SET status = 'inactive', updated_at = CURRENT_TIMESTAMP 
       WHERE provider_code = ?`,
      [providerCode]
    );
    return result.changes > 0;
  }

  /**
   * Get transaction statistics for a provider.
   */
  async getStats(providerCode: string): Promise<ProviderStats | null> {
    const provider = await this.findByCode(providerCode);
    if (!provider) return null;

    const sent = await getOne<{
      count: number;
      volume: number;
      last_at: string | null;
    }>(
      `SELECT 
         COUNT(*) as count,
         COALESCE(SUM(amount), 0) as volume,
         MAX(routed_at) as last_at
       FROM transactions 
       WHERE sender_provider = ? AND status = 'completed'`,
      [providerCode]
    );

    const received = await getOne<{
      count: number;
      volume: number;
      last_at: string | null;
    }>(
      `SELECT 
         COUNT(*) as count,
         COALESCE(SUM(amount), 0) as volume,
         MAX(routed_at) as last_at
       FROM transactions 
       WHERE recipient_provider = ? AND status = 'completed'`,
      [providerCode]
    );

    const totalSent = sent?.count || 0;
    const totalReceived = received?.count || 0;
    const volumeSent = sent?.volume || 0;
    const volumeReceived = received?.volume || 0;

    // Last transaction is whichever is more recent
    const lastAt =
      sent?.last_at && received?.last_at
        ? sent.last_at > received.last_at
          ? sent.last_at
          : received.last_at
        : sent?.last_at || received?.last_at || null;

    return {
      provider_code: provider.provider_code,
      provider_name: provider.provider_name,
      total_transactions_sent: totalSent,
      total_transactions_received: totalReceived,
      total_volume_sent: volumeSent,
      total_volume_received: volumeReceived,
      net_position: volumeReceived - volumeSent,
      last_transaction_at: lastAt,
    };
  }

  /**
   * Check if a provider exists and is active.
   */
  async isActive(providerCode: string): Promise<boolean> {
    const row = await getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM providers 
       WHERE provider_code = ? AND status IN ('active', 'sandbox')`,
      [providerCode]
    );
    return (row?.count || 0) > 0;
  }

  /**
   * Count providers by status.
   */
  async countByStatus(): Promise<Record<string, number>> {
    const rows = await runQuery<{ status: string; count: number }[]>(
      `SELECT status, COUNT(*) as count FROM providers GROUP BY status`
    );

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result;
  }
}
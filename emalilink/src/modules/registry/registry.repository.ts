import { runQuery, runMutation, getOne } from '../../config/database';
import { WalletLink } from './registry.types';

export class RegistryRepository {
  // Register a phone → wallet mapping
  async register(
    phoneNumber: string,
    providerCode: string,
    walletId: string
  ): Promise<void> {
    // Ensure phone number exists
    await runMutation(
      `INSERT OR IGNORE INTO phone_numbers (phone_number, country_code) VALUES (?, ?)`,
      [phoneNumber, this.extractCountryCode(phoneNumber)]
    );

    // Insert or update wallet link
    await runMutation(
      `INSERT INTO wallet_links (phone_number, provider_code, wallet_id, verified)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(phone_number, provider_code) 
       DO UPDATE SET wallet_id = ?, updated_at = CURRENT_TIMESTAMP`,
      [phoneNumber, providerCode, walletId, walletId]
    );
  }

  // Resolve phone number to all linked wallets
  async resolve(phoneNumber: string): Promise<WalletLink[]> {
    const rows = await runQuery<any[]>(
      `SELECT 
         wl.provider_code,
         p.provider_name,
         wl.wallet_id,
         wl.verified
       FROM wallet_links wl
       JOIN providers p ON wl.provider_code = p.provider_code
       WHERE wl.phone_number = ? 
         AND wl.status = 'active'
         AND p.status = 'active'
       ORDER BY wl.created_at ASC`,
      [phoneNumber]
    );

    return rows.map((row) => ({
      provider_code: row.provider_code,
      provider_name: row.provider_name,
      wallet_id: row.wallet_id,
      verified: row.verified === 1,
    }));
  }

  // Check if a specific phone-provider link exists
  async findLink(
    phoneNumber: string,
    providerCode: string
  ): Promise<{ wallet_id: string } | undefined> {
    return getOne<{ wallet_id: string }>(
      `SELECT wallet_id FROM wallet_links 
       WHERE phone_number = ? AND provider_code = ? AND status = 'active'`,
      [phoneNumber, providerCode]
    );
  }

  // Deactivate a wallet link
  async deactivate(phoneNumber: string, providerCode: string): Promise<boolean> {
    const result = await runMutation(
      `UPDATE wallet_links SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
       WHERE phone_number = ? AND provider_code = ?`,
      [phoneNumber, providerCode]
    );
    return result.changes > 0;
  }

  // Check if provider exists and is active
  async providerExists(providerCode: string): Promise<boolean> {
    const row = await getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM providers WHERE provider_code = ? AND status = 'active'`,
      [providerCode]
    );
    return (row?.count || 0) > 0;
  }

  private extractCountryCode(phone: string): string {
    const match = phone.match(/^\+(\d{1,3})/);
    return match ? match[1] : 'UNKNOWN';
  }
}
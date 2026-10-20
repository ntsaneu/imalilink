import { IProviderAdapter, CreditResult, DebitResult } from './base.adapter';
import { logger } from '../config/logger';
import { PROVIDER_CODES } from '../utils/providers';

export class MTNMoMoAdapter implements IProviderAdapter {
  readonly providerCode = PROVIDER_CODES.MTN_MOMO;
  readonly providerName = 'MTN MoMo';

  async creditWallet(phone: string, amount: number, currency: string, senderRef: string): Promise<CreditResult> {
    logger.info(`[MTN MoMo] Crediting ${currency} ${amount} to ${phone} (ref: ${senderRef})`);
    await new Promise((r) => setTimeout(r, 300));
    if (Math.random() < 0.98) {
      return { success: true, provider: this.providerCode, transaction_id: `MTN-${Date.now()}`, new_balance: 1200.0 };
    }
    return { success: false, provider: this.providerCode, error: 'MTN MoMo wallet not found' };
  }

  async debitWallet(phone: string, amount: number, currency: string): Promise<DebitResult> {
    logger.info(`[MTN MoMo] Debiting ${currency} ${amount} from ${phone}`);
    await new Promise((r) => setTimeout(r, 250));
    return { success: true, provider: this.providerCode, transaction_id: `MTN-DEBIT-${Date.now()}`, new_balance: 700.0 };
  }

  async healthCheck(): Promise<boolean> { return true; }
}

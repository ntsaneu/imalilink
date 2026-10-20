import { IProviderAdapter, CreditResult, DebitResult } from './base.adapter';
import { logger } from '../config/logger';

/**
 * MOCK FNB eWallet Adapter — for prototype only.
 */
export class FNBeWalletAdapter implements IProviderAdapter {
  readonly providerCode = 'fnb_ewallet';
  readonly providerName = 'FNB eWallet';

  async creditWallet(
    phone: string,
    amount: number,
    currency: string,
    senderRef: string
  ): Promise<CreditResult> {
    logger.info(`[FNB eWallet] Crediting ${currency} ${amount} to ${phone} (ref: ${senderRef})`);

    await new Promise((resolve) => setTimeout(resolve, 250));

    if (Math.random() < 0.97) {
      return {
        success: true,
        provider: this.providerCode,
        transaction_id: `FNB-${Date.now()}`,
        new_balance: 800.0,
      };
    }

    return {
      success: false,
      provider: this.providerCode,
      error: 'FNB eWallet limit exceeded',
    };
  }

  async debitWallet(phone: string, amount: number, currency: string): Promise<DebitResult> {
    logger.info(`[FNB eWallet] Debiting ${currency} ${amount} from ${phone}`);

    await new Promise((resolve) => setTimeout(resolve, 250));

    return {
      success: true,
      provider: this.providerCode,
      transaction_id: `FNB-DEBIT-${Date.now()}`,
      new_balance: 500.0,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
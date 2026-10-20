import { IProviderAdapter, CreditResult, DebitResult } from './base.adapter';
import { logger } from '../config/logger';

/**
 * MOCK Mukuru Adapter — for prototype only.
 * Replace with real API calls when sandbox access is granted.
 */
export class MukuruAdapter implements IProviderAdapter {
  readonly providerCode = 'mukuru';
  readonly providerName = 'Mukuru';

  async creditWallet(
    phone: string,
    amount: number,
    currency: string,
    senderRef: string
  ): Promise<CreditResult> {
    logger.info(`[Mukuru] Crediting ${currency} ${amount} to ${phone} (ref: ${senderRef})`);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Simulate 95% success rate
    if (Math.random() < 0.95) {
      return {
        success: true,
        provider: this.providerCode,
        transaction_id: `MUK-${Date.now()}`,
        new_balance: 1500.0,
      };
    }

    return {
      success: false,
      provider: this.providerCode,
      error: 'Mukuru wallet temporarily unavailable',
    };
  }

  async debitWallet(phone: string, amount: number, currency: string): Promise<DebitResult> {
    logger.info(`[Mukuru] Debiting ${currency} ${amount} from ${phone}`);

    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      success: true,
      provider: this.providerCode,
      transaction_id: `MUK-DEBIT-${Date.now()}`,
      new_balance: 1000.0,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
export interface CreditResult {
  success: boolean;
  provider: string;
  transaction_id?: string;
  new_balance?: number;
  error?: string;
}

export interface DebitResult {
  success: boolean;
  provider: string;
  transaction_id?: string;
  new_balance?: number;
  error?: string;
}

export interface IProviderAdapter {
  readonly providerCode: string;
  readonly providerName: string;
  creditWallet(phone: string, amount: number, currency: string, senderRef: string): Promise<CreditResult>;
  debitWallet(phone: string, amount: number, currency: string): Promise<DebitResult>;
  healthCheck(): Promise<boolean>;
}

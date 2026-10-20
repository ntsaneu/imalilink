export interface CreateTransactionRequest {
  sender_provider: string;
  sender_wallet_id: string;
  recipient_phone: string;
  recipient_provider: string;
  amount: number;
  currency?: string;
}

export interface TransactionResponse {
  transaction_id: string;
  sender: {
    provider: string;
    wallet_id: string;
  };
  recipient: {
    provider: string;
    phone: string;
    wallet_id: string;
  };
  amount: number;
  currency: string;
  status: string;
  timestamp: string;
}
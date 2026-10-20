export interface NetPosition {
  settlement_date: string;
  from_provider: string;
  to_provider: string;
  total_sent: number;
  total_received: number;
  net_amount: number;
  currency: string;
  transaction_count: number;
}

export interface SettlementInstruction {
  settlement_id: string;
  settlement_date: string;
  from_provider: string;
  to_provider: string;
  amount: number;
  currency: string;
  status: SettlementStatus;
  due_date: string;
  created_at: string;
  settled_at?: string;
}

export type SettlementStatus = 'pending' | 'instructed' | 'in_transit' | 'settled' | 'failed' | 'disputed';

export interface SettlementReport {
  settlement_date: string;
  generated_at: string;
  total_pairs: number;
  total_amount: number;
  currency: string;
  instructions: SettlementInstruction[];
  provider_summaries: ProviderSettlementSummary[];
}

export interface ProviderSettlementSummary {
  provider_code: string;
  provider_name: string;
  total_owed: number;
  total_owed_to: number;
  net_position: number;
  currency: string;
}

export interface RunNettingResult {
  settlement_date: string;
  providers_processed: number;
  pairs_netting: number;
  instructions_generated: number;
  total_volume: number;
  duration_ms: number;
}

export interface NettingEngineOptions {
  settlementDate?: string;
  minNetAmount?: number;
  currency?: string;
}

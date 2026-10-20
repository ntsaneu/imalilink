/**
 * Settlement module types.
 */

export interface ProviderPair {
  from_provider: string;
  to_provider: string;
}

export interface NetPosition {
  settlement_date: string; // YYYY-MM-DD
  from_provider: string;
  to_provider: string;
  total_sent: number;
  total_received: number;
  net_amount: number; // positive = from_provider owes to_provider
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
  due_date: string; // YYYY-MM-DD
  created_at: string;
  settled_at?: string;
  reference?: string;
  error_message?: string;
}

export type SettlementStatus =
  | 'pending'      // Netting calculated, awaiting instruction generation
  | 'instructed'   // Instruction sent to debtor provider
  | 'in_transit'   // EFT initiated, awaiting confirmation
  | 'settled'      // EFT confirmed
  | 'failed'       // EFT failed
  | 'disputed';    // Amount mismatch or dispute raised

export interface SettlementReport {
  settlement_date: string;
  generated_at: string;
  total_pairs: number;
  total_amount: number;
  currency: string;
  instructions: SettlementInstruction[];
  net_positions: NetPosition[];
  provider_summaries: ProviderSettlementSummary[];
}

export interface ProviderSettlementSummary {
  provider_code: string;
  provider_name: string;
  total_owed: number; // sum of amounts this provider owes others
  total_owed_to: number; // sum of amounts others owe this provider
  net_position: number; // positive = net receiver, negative = net payer
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
  settlementDate?: string; // YYYY-MM-DD, defaults to today
  minNetAmount?: number; // Skip pairs with net below this amount
  currency?: string; // Default: ZAR
}
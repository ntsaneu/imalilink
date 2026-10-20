export interface Provider {
  id: number;
  provider_code: string;
  provider_name: string;
  provider_type: string;
  api_endpoint: string | null;
  webhook_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderPublic {
  provider_code: string;
  provider_name: string;
  provider_type: string;
  status: string;
}

export interface ProviderStats {
  provider_code: string;
  provider_name: string;
  total_transactions_sent: number;
  total_transactions_received: number;
  total_volume_sent: number;
  total_volume_received: number;
  net_position: number;
  last_transaction_at: string | null;
}

export interface ProviderHealth {
  provider_code: string;
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
  checked_at: string;
}

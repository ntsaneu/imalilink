export interface RegisterPhoneRequest {
  phone_number: string;
  provider_code: string;
  wallet_id: string;
}

export interface RegisterPhoneResponse {
  phone_number: string;
  provider_code: string;
  wallet_id: string;
  registered_at: string;
}

export interface WalletLink {
  provider_code: string;
  provider_name: string;
  wallet_id: string;
  verified: boolean;
}

export interface ResolvePhoneResponse {
  phone_number: string;
  linked_wallets: WalletLink[];
  wallet_count: number;
}
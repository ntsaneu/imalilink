export interface ProviderDefinition {
  code: string;
  name: string;
  type: 'remittance' | 'mobile_money' | 'bank_wallet' | 'retail';
  country: string;
  currencies: string[];
  status: 'active' | 'sandbox' | 'planned';
  description: string;
}

export const PROVIDERS: ProviderDefinition[] = [
  { code: 'mukuru', name: 'Mukuru', type: 'remittance', country: 'ZA', currencies: ['ZAR'], status: 'sandbox', description: 'Largest non-bank remittance provider in Southern Africa.' },
  { code: 'mama_money', name: 'Mama Money', type: 'remittance', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Cape Town-based remittance provider.' },
  { code: 'hello_paisa', name: 'Hello Paisa', type: 'remittance', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Hello Group subsidiary.' },
  { code: 'shoprite_send', name: 'Shoprite Send', type: 'remittance', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Low-cost remittance from Shoprite stores.' },
  { code: 'western_union', name: 'Western Union', type: 'remittance', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Global money transfer operator.' },
  { code: 'moneygram', name: 'MoneyGram', type: 'remittance', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Global money transfer operator.' },
  { code: 'wise', name: 'Wise', type: 'remittance', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Global fintech.' },
  { code: 'exchange4free', name: 'Exchange4Free', type: 'remittance', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Non-bank remittance provider.' },
  { code: 'nala', name: 'NALA', type: 'remittance', country: 'TZ', currencies: ['TZS'], status: 'planned', description: 'Tanzanian remittance company.' },
  { code: 'lemfi', name: 'LemFi', type: 'remittance', country: 'NG', currencies: ['NGN'], status: 'planned', description: 'Fintech for migrants.' },
  { code: 'mtn_momo', name: 'MTN MoMo', type: 'mobile_money', country: 'ZA', currencies: ['ZAR'], status: 'sandbox', description: 'MTN mobile money wallet.' },
  { code: 'mtn_momo_ls', name: 'MTN MoMo Lesotho', type: 'mobile_money', country: 'LS', currencies: ['LSL', 'ZAR'], status: 'sandbox', description: 'MTN MoMo in Lesotho.' },
  { code: 'mtn_momo_zw', name: 'MTN MoMo Zimbabwe', type: 'mobile_money', country: 'ZW', currencies: ['USD'], status: 'planned', description: 'MTN MoMo in Zimbabwe.' },
  { code: 'vodacom_mpesa', name: 'Vodacom M-Pesa', type: 'mobile_money', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Vodacom mobile money.' },
  { code: 'mpesa_ke', name: 'M-Pesa Kenya', type: 'mobile_money', country: 'KE', currencies: ['KES'], status: 'planned', description: 'Safaricom mobile money.' },
  { code: 'mpesa_tz', name: 'M-Pesa Tanzania', type: 'mobile_money', country: 'TZ', currencies: ['TZS'], status: 'planned', description: 'Vodacom M-Pesa Tanzania.' },
  { code: 'ecocash', name: 'EcoCash', type: 'mobile_money', country: 'ZW', currencies: ['USD'], status: 'planned', description: 'Econet mobile money.' },
  { code: 'orange_money', name: 'Orange Money', type: 'mobile_money', country: 'SN', currencies: ['XOF'], status: 'planned', description: 'Orange mobile money.' },
  { code: 'airtel_money', name: 'Airtel Money', type: 'mobile_money', country: 'KE', currencies: ['KES'], status: 'planned', description: 'Airtel mobile money.' },
  { code: 'tigo_pesa', name: 'Tigo Pesa', type: 'mobile_money', country: 'TZ', currencies: ['TZS'], status: 'planned', description: 'Tigo mobile money.' },
  { code: 'fnb_ewallet', name: 'FNB eWallet', type: 'bank_wallet', country: 'ZA', currencies: ['ZAR'], status: 'sandbox', description: 'FNB cardless cash wallet.' },
  { code: 'fnb_ewallet_ls', name: 'FNB eWallet Lesotho', type: 'bank_wallet', country: 'LS', currencies: ['LSL'], status: 'planned', description: 'FNB Lesotho eWallet.' },
  { code: 'absa_cashsend', name: 'ABSA Cash Send', type: 'bank_wallet', country: 'ZA', currencies: ['ZAR'], status: 'sandbox', description: 'ABSA cardless cash voucher.' },
  { code: 'standard_bank_im', name: 'Standard Bank Instant Money', type: 'bank_wallet', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Standard Bank cardless cash.' },
  { code: 'capitec', name: 'Capitec', type: 'bank_wallet', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Capitec bank.' },
  { code: 'nedbank', name: 'Nedbank', type: 'bank_wallet', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Nedbank.' },
  { code: 'tyme_bank', name: 'TymeBank', type: 'bank_wallet', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Digital bank.' },
  { code: 'discovery_bank', name: 'Discovery Bank', type: 'bank_wallet', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Digital bank.' },
  { code: 'ecobank', name: 'Ecobank', type: 'bank_wallet', country: 'TG', currencies: ['XOF'], status: 'planned', description: 'Pan-African bank.' },
  { code: 'shoprite_money_market', name: 'Shoprite Money Market', type: 'retail', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Shoprite Money Market Account.' },
  { code: 'picknpay_wallet', name: 'Pick n Pay Wallet', type: 'retail', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Pick n Pay money transfer.' },
  { code: 'pep_wallet', name: 'PEP Wallet', type: 'retail', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'PEP money transfer.' },
  { code: 'boxer_wallet', name: 'Boxer Wallet', type: 'retail', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Boxer money transfer.' },
  { code: 'mfs_africa', name: 'MFS Africa', type: 'remittance', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Pan-African interoperability hub.' },
  { code: 'onafriq', name: 'Onafriq', type: 'remittance', country: 'ZA', currencies: ['ZAR'], status: 'planned', description: 'Formerly MFS Africa.' },
];

export const getProvider = (code: string) => PROVIDERS.find((p) => p.code === code);
export const isValidProvider = (code: string): boolean => PROVIDERS.some((p) => p.code === code);

export const PROVIDER_CODES = {
  MUKURU: 'mukuru',
  MAMA_MONEY: 'mama_money',
  HELLO_PAISA: 'hello_paisa',
  MTN_MOMO: 'mtn_momo',
  MTN_MOMO_LS: 'mtn_momo_ls',
  FNB_EWALLET: 'fnb_ewallet',
  ABSA_CASHSEND: 'absa_cashsend',
} as const;

-- eMali_link Initial Schema

-- Providers table
CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_code TEXT UNIQUE NOT NULL,
    provider_name TEXT NOT NULL,
    api_endpoint TEXT,
    api_key_encrypted TEXT,
    webhook_url TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Phone numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
    phone_number TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Wallet links table (the core of the proxy registry)
CREATE TABLE IF NOT EXISTS wallet_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    wallet_id TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (phone_number) REFERENCES phone_numbers(phone_number),
    FOREIGN KEY (provider_code) REFERENCES providers(provider_code),
    UNIQUE(phone_number, provider_code)
);

-- Transactions table (append-only ledger)
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT UNIQUE NOT NULL,
    sender_provider TEXT NOT NULL,
    sender_wallet_id TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    recipient_provider TEXT NOT NULL,
    recipient_wallet_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    status TEXT DEFAULT 'pending',
    idempotency_key TEXT UNIQUE,
    error_message TEXT,
    routed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    settled_at DATETIME,
    settlement_reference TEXT
);

-- Ledger entries (double-entry)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    wallet_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('debit', 'credit')),
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id)
);

-- Settlement netting table
CREATE TABLE IF NOT EXISTS settlement_netting (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    settlement_date DATE NOT NULL,
    from_provider TEXT NOT NULL,
    to_provider TEXT NOT NULL,
    net_amount REAL NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    status TEXT DEFAULT 'pending',
    settled_at DATETIME,
    UNIQUE(settlement_date, from_provider, to_provider)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_links_phone ON wallet_links(phone_number);
CREATE INDEX IF NOT EXISTS idx_wallet_links_provider ON wallet_links(provider_code);
CREATE INDEX IF NOT EXISTS idx_transactions_recipient ON transactions(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_settlement_date ON settlement_netting(settlement_date);

-- Add provider_type column if it doesn't exist
ALTER TABLE providers ADD COLUMN provider_type TEXT DEFAULT 'remittance';

-- Update existing providers with their types
UPDATE providers SET provider_type = 'remittance' WHERE provider_code IN 
  ('mukuru', 'mama_money', 'hello_paisa', 'shoprite_send', 
   'western_union', 'moneygram', 'wise', 'exchange4free', 'nala', 'lemfi',
   'mfs_africa', 'onafriq');

UPDATE providers SET provider_type = 'mobile_money' WHERE provider_code IN 
  ('mtn_momo', 'mtn_momo_ls', 'mtn_momo_zw', 'vodacom_mpesa',
   'mpesa_ke', 'mpesa_tz', 'ecocash', 'orange_money', 'airtel_money', 'tigo_pesa');

UPDATE providers SET provider_type = 'bank_wallet' WHERE provider_code IN 
  ('fnb_ewallet', 'fnb_ewallet_ls', 'absa_cashsend', 'standard_bank_im',
   'capitec', 'nedbank', 'tyme_bank', 'discovery_bank', 'ecobank');

UPDATE providers SET provider_type = 'retail' WHERE provider_code IN 
  ('shoprite_money_market', 'picknpay_wallet', 'pep_wallet', 'boxer_wallet');
CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_code TEXT UNIQUE NOT NULL,
    provider_name TEXT NOT NULL,
    provider_type TEXT DEFAULT 'remittance',
    api_endpoint TEXT,
    api_key_encrypted TEXT,
    webhook_url TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS phone_numbers (
    phone_number TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS provider_api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_code TEXT NOT NULL,
    api_key_hash TEXT UNIQUE NOT NULL,
    api_key_prefix TEXT NOT NULL,
    scopes TEXT DEFAULT 'read,write',
    status TEXT DEFAULT 'active',
    last_used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (provider_code) REFERENCES providers(provider_code)
);

CREATE INDEX IF NOT EXISTS idx_wallet_links_phone ON wallet_links(phone_number);
CREATE INDEX IF NOT EXISTS idx_wallet_links_provider ON wallet_links(provider_code);
CREATE INDEX IF NOT EXISTS idx_transactions_recipient ON transactions(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_settlement_date ON settlement_netting(settlement_date);
CREATE INDEX IF NOT EXISTS idx_api_key_hash ON provider_api_keys(api_key_hash);

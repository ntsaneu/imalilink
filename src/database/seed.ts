import { runMutation, db } from '../config/database';
import { logger } from '../config/logger';
import { PROVIDERS } from '../utils/providers';
import { generateApiKey } from '../middleware/auth';

const seedProviders = async () => {
  logger.info(`Seeding ${PROVIDERS.length} providers...`);
  for (const provider of PROVIDERS) {
    await runMutation(
      `INSERT OR REPLACE INTO providers (provider_code, provider_name, provider_type, api_endpoint, status) VALUES (?, ?, ?, ?, ?)`,
      [provider.code, provider.name, provider.type, `https://api.${provider.code}.emalilink.local`, provider.status === 'planned' ? 'inactive' : 'active']
    );
  }
  logger.info(`Seeded ${PROVIDERS.length} providers`);
};

const seedApiKeys = async () => {
  const sandboxProviders = PROVIDERS.filter((p) => p.status === 'sandbox');
  logger.info(`Generating API keys for ${sandboxProviders.length} sandbox providers...`);
  for (const provider of sandboxProviders) {
    const { apiKey, hash, prefix } = generateApiKey('test');
    await runMutation(
      `INSERT OR REPLACE INTO provider_api_keys (provider_code, api_key_hash, api_key_prefix, scopes, status) VALUES (?, ?, ?, 'read,write', 'active')`,
      [provider.code, hash, prefix]
    );
    console.log(`\nAPI Key for ${provider.code}: ${apiKey}\n`);
  }
};

const seedTestData = async () => {
  const testData = [
    { phone: '+27831234567', provider: 'fnb_ewallet', wallet: 'FNB-USER-001' },
    { phone: '+27831234567', provider: 'mtn_momo', wallet: 'MTN-USER-001' },
    { phone: '+27831234567', provider: 'mukuru', wallet: 'MUK-USER-001' },
    { phone: '+26656781234', provider: 'mtn_momo_ls', wallet: 'MTN-LS-001' },
    { phone: '+263771234567', provider: 'ecocash', wallet: 'ECO-ZW-001' },
    { phone: '+27829998888', provider: 'absa_cashsend', wallet: 'ABSA-USER-001' },
  ];
  for (const d of testData) {
    const countryCode = d.phone.match(/^\+(\d{1,3})/)?.[1] || 'UNKNOWN';
    await runMutation(`INSERT OR IGNORE INTO phone_numbers (phone_number, country_code, verified) VALUES (?, ?, 1)`, [d.phone, countryCode]);
    await runMutation(`INSERT OR IGNORE INTO wallet_links (phone_number, provider_code, wallet_id, verified) VALUES (?, ?, ?, 1)`, [d.phone, d.provider, d.wallet]);
  }
  logger.info(`Seeded ${testData.length} test wallet links`);
};

const seed = async () => {
  try {
    logger.info('Starting database seed...');
    await seedProviders();
    await seedApiKeys();
    await seedTestData();
    logger.info('Database seeded successfully');
    db.close();
  } catch (error) {
    logger.error('Seeding failed:', error);
    db.close();
    process.exit(1);
  }
};

seed();

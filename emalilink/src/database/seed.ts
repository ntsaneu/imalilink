import { runMutation, db } from '../config/database';
import { logger } from '../config/logger';

const seedProviders = async () => {
  const providers = [
    { code: 'mukuru', name: 'Mukuru' },
    { code: 'mtn_momo', name: 'MTN MoMo' },
    { code: 'fnb_ewallet', name: 'FNB eWallet' },
    { code: 'hello_paisa', name: 'Hello Paisa' },
    { code: 'absa_cashsend', name: 'ABSA Cash Send' },
    { code: 'standard_bank_im', name: 'Standard Bank Instant Money' },
    { code: 'capitec', name: 'Capitec' },
    { code: 'mama_money', name: 'Mama Money' },
  ];

  for (const p of providers) {
    await runMutation(
      `INSERT OR IGNORE INTO providers (provider_code, provider_name) VALUES (?, ?)`,
      [p.code, p.name]
    );
  }

  logger.info(`✅ Seeded ${providers.length} providers`);
};

const seedTestData = async () => {
  // Register test phone numbers
  const testData = [
    { phone: '+27831234567', provider: 'fnb_ewallet', wallet: 'FNB-USER-001' },
    { phone: '+27831234567', provider: 'mtn_momo', wallet: 'MTN-USER-001' },
    { phone: '+27831234567', provider: 'mukuru', wallet: 'MUK-USER-001' },
    { phone: '+26656781234', provider: 'mtn_momo', wallet: 'MTN-LS-001' },
  ];

  for (const d of testData) {
    await runMutation(
      `INSERT OR IGNORE INTO phone_numbers (phone_number, country_code, verified) VALUES (?, ?, 1)`,
      [d.phone, d.phone.substring(1, 3)]
    );

    await runMutation(
      `INSERT OR IGNORE INTO wallet_links (phone_number, provider_code, wallet_id, verified) 
       VALUES (?, ?, ?, 1)`,
      [d.phone, d.provider, d.wallet]
    );
  }

  logger.info(`✅ Seeded test phone numbers`);
};

const seed = async () => {
  try {
    logger.info('🌱 Seeding database...');
    await seedProviders();
    await seedTestData();
    logger.info('✅ Database seeded successfully');
    db.close();
  } catch (error) {
    logger.error('Seeding failed:', error);
    db.close();
    process.exit(1);
  }
};

seed();

const seedProviders = async () => {
  logger.info(`🌱 Seeding ${PROVIDERS.length} providers...`);

  for (const provider of PROVIDERS) {
    await runMutation(
      `INSERT OR REPLACE INTO providers 
        (provider_code, provider_name, provider_type, api_endpoint, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        provider.code,
        provider.name,
        provider.type,
        `https://api.${provider.code}.emalilink.local`,
        provider.status === 'planned' ? 'inactive' : 'active',
      ]
    );
  }

  logger.info(`✅ Seeded ${PROVIDERS.length} providers`);
};
import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../src/app';
import { db, runMutation, runQuery } from '../src/config/database';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

describe('Transaction Module', () => {
  let app: Application;

  const senderWallet = 'TEST-SENDER-WALLET';
  const recipientPhone = '+27837776666';
  const recipientWallet = 'TEST-RECIPIENT-WALLET';

  beforeAll(async () => {
    const schema = fs.readFileSync(
      path.join(__dirname, '../src/database/migrations/001_initial_schema.sql'),
      'utf8'
    );
    await new Promise<void>((resolve, reject) => {
      db.exec(schema, (err) => (err ? reject(err) : resolve()));
    });

    // Seed providers
    for (const p of [
      { code: 'mukuru', name: 'Mukuru', type: 'remittance' },
      { code: 'mtn_momo', name: 'MTN MoMo', type: 'mobile_money' },
      { code: 'fnb_ewallet', name: 'FNB eWallet', type: 'bank_wallet' },
    ]) {
      await runMutation(
        `INSERT OR IGNORE INTO providers (provider_code, provider_name, provider_type, status)
         VALUES (?, ?, ?, 'active')`,
        [p.code, p.name, p.type]
      );
    }

    // Register recipient phone → fnb_ewallet
    await runMutation(
      `INSERT OR IGNORE INTO phone_numbers (phone_number, country_code, verified)
       VALUES (?, '27', 1)`,
      [recipientPhone]
    );
    await runMutation(
      `INSERT OR IGNORE INTO wallet_links (phone_number, provider_code, wallet_id, verified)
       VALUES (?, 'fnb_ewallet', ?, 1)`,
      [recipientPhone, recipientWallet]
    );

    app = createApp();
  });

  afterAll(async () => {
    await runMutation(`DELETE FROM ledger_entries WHERE transaction_id LIKE 'EM-%'`);
    await runMutation(`DELETE FROM transactions WHERE transaction_id LIKE 'EM-%'`);
    await runMutation(`DELETE FROM wallet_links WHERE phone_number = ?`, [recipientPhone]);
    await runMutation(`DELETE FROM phone_numbers WHERE phone_number = ?`, [recipientPhone]);
    db.close();
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/v1/transactions
  // ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/transactions', () => {
    it('should create a successful transaction', async () => {
      const idempotencyKey = `test-${uuidv4()}`;

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Idempotency-Key', idempotencyKey)
        .send({
          sender_provider: 'mukuru',
          sender_wallet_id: senderWallet,
          recipient_phone: recipientPhone,
          recipient_provider: 'fnb_ewallet',
          amount: 500.0,
          currency: 'ZAR',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction_id).toMatch(/^EM-/);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.amount).toBe(500);
      expect(response.body.data.recipient.phone).toBe(recipientPhone);
      expect(response.body.data.recipient.wallet_id).toBe(recipientWallet);
    });

    it('should reject missing Idempotency-Key header', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .send({
          sender_provider: 'mukuru',
          sender_wallet_id: senderWallet,
          recipient_phone: recipientPhone,
          recipient_provider: 'fnb_ewallet',
          amount: 500.0,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Idempotency-Key');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Idempotency-Key', uuidv4())
        .send({ amount: 100 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject amount <= 0', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Idempotency-Key', uuidv4())
        .send({
          sender_provider: 'mukuru',
          sender_wallet_id: senderWallet,
          recipient_phone: recipientPhone,
          recipient_provider: 'fnb_ewallet',
          amount: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('greater than 0');
    });

    it('should reject unknown sender provider', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Idempotency-Key', uuidv4())
        .send({
          sender_provider: 'nonexistent',
          sender_wallet_id: senderWallet,
          recipient_phone: recipientPhone,
          recipient_provider: 'fnb_ewallet',
          amount: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject unregistered recipient', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Idempotency-Key', uuidv4())
        .send({
          sender_provider: 'mukuru',
          sender_wallet_id: senderWallet,
          recipient_phone: '+27831111111',
          recipient_provider: 'fnb_ewallet',
          amount: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not registered');
    });

    it('should handle idempotent replay (same key returns same tx)', async () => {
      const idempotencyKey = `test-${uuidv4()}`;
      const body = {
        sender_provider: 'mukuru',
        sender_wallet_id: senderWallet,
        recipient_phone: recipientPhone,
        recipient_provider: 'fnb_ewallet',
        amount: 250.0,
      };

      // First call
      const first = await request(app)
        .post('/api/v1/transactions')
        .set('Idempotency-Key', idempotencyKey)
        .send(body);

      expect(first.status).toBe(201);

      // Second call with same key
      const second = await request(app)
        .post('/api/v1/transactions')
        .set('Idempotency-Key', idempotencyKey)
        .send(body);

      expect(second.status).toBe(200);
      expect(second.body.data.idempotent_replay).toBe(true);
      expect(second.body.data.transaction_id).toBe(first.body.data.transaction_id);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/v1/transactions/:transaction_id
  // ─────────────────────────────────────────────────────────────────

  describe('GET /api/v1/transactions/:transaction_id', () => {
    it('should retrieve a transaction by ID', async () => {
      const idempotencyKey = `test-${uuidv4()}`;

      const createResponse = await request(app)
        .post('/api/v1/transactions')
        .set('Idempotency-Key', idempotencyKey)
        .send({
          sender_provider: 'mukuru',
          sender_wallet_id: senderWallet,
          recipient_phone: recipientPhone,
          recipient_provider: 'fnb_ewallet',
          amount: 100.0,
        });

      const txId = createResponse.body.data.transaction_id;

      const response = await request(app).get(`/api/v1/transactions/${txId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction_id).toBe(txId);
      expect(response.body.data.amount).toBe(100);
    });

    it('should return 404 for unknown transaction', async () => {
      const response = await request(app).get('/api/v1/transactions/EM-UNKNOWN-999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Ledger verification
  // ─────────────────────────────────────────────────────────────────

  describe('Ledger entries', () => {
    it('should create double-entry records for a transaction', async () => {
      const idempotencyKey = `test-${uuidv4()}`;

      const createResponse = await request(app)
        .post('/api/v1/transactions')
        .set('Idempotency-Key', idempotencyKey)
        .send({
          sender_provider: 'mukuru',
          sender_wallet_id: senderWallet,
          recipient_phone: recipientPhone,
          recipient_provider: 'fnb_ewallet',
          amount: 300.0,
        });

      const txId = createResponse.body.data.transaction_id;

      const entries = await runQuery<any[]>(
        `SELECT direction, provider_code, amount FROM ledger_entries WHERE transaction_id = ?`,
        [txId]
      );

      expect(entries.length).toBe(2);

      const debit = entries.find((e) => e.direction === 'debit');
      const credit = entries.find((e) => e.direction === 'credit');

      expect(debit).toBeDefined();
      expect(credit).toBeDefined();
      expect(debit!.provider_code).toBe('mukuru');
      expect(credit!.provider_code).toBe('fnb_ewallet');
      expect(debit!.amount).toBe(300);
      expect(credit!.amount).toBe(300);
    });
  });
});
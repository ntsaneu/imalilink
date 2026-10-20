import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../src/app';
import { db, runMutation } from '../src/config/database';
import fs from 'fs';
import path from 'path';

describe('Registry Module', () => {
  let app: Application;
  const testPhone = '+27839998888';
  const testProvider = 'fnb_ewallet';
  const testWalletId = 'TEST-FNB-001';

  beforeAll(async () => {
    const schema = fs.readFileSync(path.join(__dirname, '../src/database/migrations/001_initial_schema.sql'), 'utf8');
    await new Promise<void>((resolve, reject) => db.exec(schema, (err) => (err ? reject(err) : resolve())));

    await runMutation(`INSERT OR IGNORE INTO providers (provider_code, provider_name, provider_type, status) VALUES (?, ?, ?, ?)`, [testProvider, 'FNB eWallet', 'bank_wallet', 'active']);
    await runMutation(`INSERT OR IGNORE INTO providers (provider_code, provider_name, provider_type, status) VALUES (?, ?, ?, ?)`, ['mtn_momo', 'MTN MoMo', 'mobile_money', 'active']);

    app = createApp();
  });

  afterAll(async () => {
    await runMutation(`DELETE FROM wallet_links WHERE phone_number = ?`, [testPhone]);
    await runMutation(`DELETE FROM phone_numbers WHERE phone_number = ?`, [testPhone]);
    db.close();
  });

  it('should register a phone number to a wallet', async () => {
    const response = await request(app).post('/api/v1/registry/register').send({
      phone_number: testPhone, provider_code: testProvider, wallet_id: testWalletId,
    });
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.phone_number).toBe(testPhone);
  });

  it('should reject registration with missing fields', async () => {
    const response = await request(app).post('/api/v1/registry/register').send({ phone_number: testPhone });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should reject invalid phone number format', async () => {
    const response = await request(app).post('/api/v1/registry/register').send({
      phone_number: 'invalid-phone', provider_code: testProvider, wallet_id: testWalletId,
    });
    expect(response.status).toBe(400);
  });

  it('should reject unknown provider', async () => {
    const response = await request(app).post('/api/v1/registry/register').send({
      phone_number: testPhone, provider_code: 'nonexistent_provider', wallet_id: testWalletId,
    });
    expect(response.status).toBe(400);
  });

  it('should allow same phone to register multiple providers', async () => {
    const response = await request(app).post('/api/v1/registry/register').send({
      phone_number: testPhone, provider_code: 'mtn_momo', wallet_id: 'TEST-MTN-001',
    });
    expect(response.status).toBe(201);
  });

  it('should resolve a phone number to all linked wallets', async () => {
    const response = await request(app).get(`/api/v1/registry/resolve/${encodeURIComponent(testPhone)}`);
    expect(response.status).toBe(200);
    expect(response.body.data.wallet_count).toBeGreaterThanOrEqual(2);
    expect(response.body.data.linked_wallets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider_code: testProvider }),
        expect.objectContaining({ provider_code: 'mtn_momo' }),
      ])
    );
  });

  it('should return empty list for unknown phone number', async () => {
    const response = await request(app).get('/api/v1/registry/resolve/+27830000000');
    expect(response.status).toBe(200);
    expect(response.body.data.wallet_count).toBe(0);
  });

  it('should deactivate a wallet link', async () => {
    const response = await request(app).delete(`/api/v1/registry/${encodeURIComponent(testPhone)}/mtn_momo`);
    expect(response.status).toBe(200);
    expect(response.body.data.deactivated).toBe(true);
  });
});

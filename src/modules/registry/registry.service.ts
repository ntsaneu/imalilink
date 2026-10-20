import { RegistryRepository } from './registry.repository';
import { normalizePhone } from '../../utils/phoneValidator';
import { RegisterPhoneRequest, RegisterPhoneResponse, ResolvePhoneResponse } from './registry.types';

export class RegistryService {
  private repository: RegistryRepository;

  constructor() {
    this.repository = new RegistryRepository();
  }

  async registerPhone(request: RegisterPhoneRequest): Promise<RegisterPhoneResponse> {
    const normalized = normalizePhone(request.phone_number);
    if (!normalized) throw new Error('Invalid phone number format. Use E.164 (e.g., +27831234567)');

    const providerExists = await this.repository.providerExists(request.provider_code);
    if (!providerExists) throw new Error(`Provider ${request.provider_code} not found or inactive`);

    await this.repository.register(normalized, request.provider_code, request.wallet_id);

    return {
      phone_number: normalized,
      provider_code: request.provider_code,
      wallet_id: request.wallet_id,
      registered_at: new Date().toISOString(),
    };
  }

  async resolvePhone(phoneNumber: string): Promise<ResolvePhoneResponse> {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized) throw new Error('Invalid phone number format. Use E.164 (e.g., +27831234567)');

    const wallets = await this.repository.resolve(normalized);

    return {
      phone_number: normalized,
      linked_wallets: wallets,
      wallet_count: wallets.length,
    };
  }

  async deactivateLink(phoneNumber: string, providerCode: string): Promise<boolean> {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized) throw new Error('Invalid phone number format');
    return this.repository.deactivate(normalized, providerCode);
  }

  async findWallet(phoneNumber: string, providerCode: string): Promise<string | null> {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized) return null;
    const link = await this.repository.findLink(normalized, providerCode);
    return link?.wallet_id || null;
  }
}

import { ProviderRepository } from './provider.repository';
import { adapterRegistry } from '../../adapters/adapter.registry';
import { logger } from '../../config/logger';
import {
  Provider,
  ProviderPublic,
  CreateProviderRequest,
  UpdateProviderRequest,
  ProviderStats,
  ProviderHealth,
} from './provider.types';

export class ProviderService {
  private repository: ProviderRepository;

  constructor() {
    this.repository = new ProviderRepository();
  }

  /**
   * Get all providers, optionally filtered.
   */
  async listProviders(filters?: {
    status?: string;
    type?: string;
  }): Promise<ProviderPublic[]> {
    const providers = await this.repository.findAll(filters);

    return providers.map((p) => ({
      provider_code: p.provider_code,
      provider_name: p.provider_name,
      provider_type: p.provider_type,
      status: p.status,
    }));
  }

  /**
   * Get a single provider by code.
   */
  async getProvider(providerCode: string): Promise<Provider> {
    const provider = await this.repository.findByCode(providerCode);

    if (!provider) {
      throw new Error(`Provider ${providerCode} not found`);
    }

    return provider;
  }

  /**
   * Get a public-facing view of a provider.
   */
  async getPublicProvider(providerCode: string): Promise<ProviderPublic> {
    const provider = await this.getProvider(providerCode);

    return {
      provider_code: provider.provider_code,
      provider_name: provider.provider_name,
      provider_type: provider.provider_type,
      status: provider.status,
    };
  }

  /**
   * Create a new provider (admin only).
   */
  async createProvider(request: CreateProviderRequest): Promise<ProviderPublic> {
    // Validate provider code format
    if (!/^[a-z][a-z0-9_]{2,49}$/.test(request.provider_code)) {
      throw new Error(
        'Invalid provider code. Use lowercase letters, numbers, and underscores (3-50 chars).'
      );
    }

    // Check if provider already exists
    const existing = await this.repository.findByCode(request.provider_code);
    if (existing) {
      throw new Error(`Provider ${request.provider_code} already exists`);
    }

    // Validate provider type
    const validTypes = ['remittance', 'mobile_money', 'bank_wallet', 'retail'];
    if (!validTypes.includes(request.provider_type)) {
      throw new Error(
        `Invalid provider type. Must be one of: ${validTypes.join(', ')}`
      );
    }

    // Create the provider
    await this.repository.create({
      provider_code: request.provider_code,
      provider_name: request.provider_name,
      provider_type: request.provider_type,
      api_endpoint: request.api_endpoint,
      webhook_url: request.webhook_url,
      status: 'active',
    });

    logger.info(`Provider created: ${request.provider_code}`);

    return this.getPublicProvider(request.provider_code);
  }

  /**
   * Update a provider (admin only).
   */
  async updateProvider(
    providerCode: string,
    updates: UpdateProviderRequest
  ): Promise<ProviderPublic> {
    // Ensure provider exists
    await this.getProvider(providerCode);

    // Validate status if provided
    if (updates.status) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(updates.status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        );
      }
    }

    const updated = await this.repository.update(providerCode, updates);

    if (!updated) {
      throw new Error(`No updates applied to provider ${providerCode}`);
    }

    logger.info(`Provider updated: ${providerCode}`);

    return this.getPublicProvider(providerCode);
  }

  /**
   * Deactivate a provider (soft delete).
   */
  async deactivateProvider(providerCode: string): Promise<boolean> {
    const provider = await this.getProvider(providerCode);

    if (provider.status === 'inactive') {
      throw new Error(`Provider ${providerCode} is already inactive`);
    }

    const deleted = await this.repository.delete(providerCode);

    logger.info(`Provider deactivated: ${providerCode}`);

    return deleted;
  }

  /**
   * Get transaction statistics for a provider.
   */
  async getProviderStats(providerCode: string): Promise<ProviderStats> {
    const stats = await this.repository.getStats(providerCode);

    if (!stats) {
      throw new Error(`Provider ${providerCode} not found`);
    }

    return stats;
  }

  /**
   * Check the health of a provider's adapter.
   */
  async checkProviderHealth(providerCode: string): Promise<ProviderHealth> {
    const provider = await this.getProvider(providerCode);
    const adapter = adapterRegistry.get(providerCode);

    if (!adapter) {
      return {
        provider_code: providerCode,
        status: 'down',
        latency_ms: -1,
        checked_at: new Date().toISOString(),
      };
    }

    const start = Date.now();

    try {
      const healthy = await adapter.healthCheck();
      const latency = Date.now() - start;

      return {
        provider_code: providerCode,
        status: healthy ? 'healthy' : 'degraded',
        latency_ms: latency,
        checked_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Health check failed for ${providerCode}:`, error);

      return {
        provider_code: providerCode,
        status: 'down',
        latency_ms: Date.now() - start,
        checked_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Check health of all providers.
   */
  async checkAllProvidersHealth(): Promise<ProviderHealth[]> {
    const providers = await this.repository.findActive();

    const healthChecks = await Promise.all(
      providers.map((p) => this.checkProviderHealth(p.provider_code))
    );

    return healthChecks;
  }

  /**
   * Get a summary of the provider ecosystem.
   */
  async getProviderSummary(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    with_adapters: number;
  }> {
    const all = await this.repository.findAll();
    const byStatus = await this.repository.countByStatus();

    const byType: Record<string, number> = {};
    for (const p of all) {
      byType[p.provider_type] = (byType[p.provider_type] || 0) + 1;
    }

    return {
      total: all.length,
      by_status: byStatus,
      by_type: byType,
      with_adapters: adapterRegistry.getAll().length,
    };
  }

  /**
   * Get list of providers with working adapters.
   */
  async getProvidersWithAdapters(): Promise<ProviderPublic[]> {
    const codes = adapterRegistry.getAvailableCodes();

    if (codes.length === 0) return [];

    const providers = await Promise.all(
      codes.map((code) => this.getPublicProvider(code).catch(() => null))
    );

    return providers.filter((p): p is ProviderPublic => p !== null);
  }

  /**
   * Check if a provider can send money.
   */
  async canSend(providerCode: string): Promise<boolean> {
    const active = await this.repository.isActive(providerCode);
    const hasAdapter = adapterRegistry.has(providerCode);

    return active && hasAdapter;
  }

  /**
   * Check if a provider can receive money.
   * All registered providers can receive (bank wallets, mobile money, etc.).
   */
  async canReceive(providerCode: string): Promise<boolean> {
    return this.repository.isActive(providerCode);
  }
}
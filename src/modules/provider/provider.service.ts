import { ProviderRepository } from './provider.repository';
import { adapterRegistry } from '../../adapters/adapter.registry';
import { logger } from '../../config/logger';
import { Provider, ProviderPublic, ProviderStats, ProviderHealth } from './provider.types';

export class ProviderService {
  private repository: ProviderRepository;

  constructor() { this.repository = new ProviderRepository(); }

  async listProviders(filters?: { status?: string; type?: string }): Promise<ProviderPublic[]> {
    const providers = await this.repository.findAll(filters);
    return providers.map((p) => ({ provider_code: p.provider_code, provider_name: p.provider_name, provider_type: p.provider_type, status: p.status }));
  }

  async getProvider(providerCode: string): Promise<Provider> {
    const provider = await this.repository.findByCode(providerCode);
    if (!provider) throw new Error(`Provider ${providerCode} not found`);
    return provider;
  }

  async getPublicProvider(providerCode: string): Promise<ProviderPublic> {
    const p = await this.getProvider(providerCode);
    return { provider_code: p.provider_code, provider_name: p.provider_name, provider_type: p.provider_type, status: p.status };
  }

  async getProviderStats(providerCode: string): Promise<ProviderStats> {
    const stats = await this.repository.getStats(providerCode);
    if (!stats) throw new Error(`Provider ${providerCode} not found`);
    return stats;
  }

  async checkProviderHealth(providerCode: string): Promise<ProviderHealth> {
    await this.getProvider(providerCode);
    const adapter = adapterRegistry.get(providerCode);
    if (!adapter) return { provider_code: providerCode, status: 'down', latency_ms: -1, checked_at: new Date().toISOString() };
    const start = Date.now();
    try {
      const healthy = await adapter.healthCheck();
      return { provider_code: providerCode, status: healthy ? 'healthy' : 'degraded', latency_ms: Date.now() - start, checked_at: new Date().toISOString() };
    } catch (error) {
      return { provider_code: providerCode, status: 'down', latency_ms: Date.now() - start, checked_at: new Date().toISOString() };
    }
  }

  async checkAllProvidersHealth(): Promise<ProviderHealth[]> {
    const providers = await this.repository.findActive();
    return Promise.all(providers.map((p) => this.checkProviderHealth(p.provider_code)));
  }

  async getProviderSummary(): Promise<{ total: number; by_status: Record<string, number>; by_type: Record<string, number>; with_adapters: number }> {
    const all = await this.repository.findAll();
    const byStatus = await this.repository.countByStatus();
    const byType: Record<string, number> = {};
    for (const p of all) byType[p.provider_type] = (byType[p.provider_type] || 0) + 1;
    return { total: all.length, by_status: byStatus, by_type: byType, with_adapters: adapterRegistry.getAll().length };
  }

  async getProvidersWithAdapters(): Promise<ProviderPublic[]> {
    const codes = adapterRegistry.getAvailableCodes();
    if (codes.length === 0) return [];
    const providers = await Promise.all(codes.map((code) => this.getPublicProvider(code).catch(() => null)));
    return providers.filter((p): p is ProviderPublic => p !== null);
  }
}

import { IProviderAdapter } from './base.adapter';
import { MukuruAdapter } from './mukuru.adapter';
import { MTNMoMoAdapter } from './mtn_momo.adapter';
import { FNBeWalletAdapter } from './fnb_ewallet.adapter';

/**
 * Central registry of all provider adapters.
 * Add new adapters here as they are built.
 */
class AdapterRegistry {
  private adapters: Map<string, IProviderAdapter> = new Map();

  constructor() {
    this.register(new MukuruAdapter());
    this.register(new MTNMoMoAdapter());
    this.register(new FNBeWalletAdapter());
  }

  private register(adapter: IProviderAdapter): void {
    this.adapters.set(adapter.providerCode, adapter);
  }

  get(providerCode: string): IProviderAdapter | undefined {
    return this.adapters.get(providerCode);
  }

  getAll(): IProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  has(providerCode: string): boolean {
    return this.adapters.has(providerCode);
  }
}

export const adapterRegistry = new AdapterRegistry();
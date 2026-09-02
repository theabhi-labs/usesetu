import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: string;
}

export const tenantLocalStorage = new AsyncLocalStorage<TenantStore>();

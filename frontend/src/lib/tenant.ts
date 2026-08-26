export type TenantContextType = 'PLATFORM' | 'TENANT' | 'UNKNOWN';

export interface TenantContext {
  type: TenantContextType;
  isRootPlatform: boolean;
  isTenantApplication: boolean;
  tenantSlug: string | null;
  hostname: string;
}

/**
 * Single Canonical Frontend Tenant Context Resolver:
 * - Production:
 *   - usesetu.com / www.usesetu.com / app.usesetu.com => PLATFORM
 *   - <slug>.usesetu.com => TENANT (slug resolved from subdomain, query param does not override)
 *   - recognized custom domain (e.g. mykendra.in) => TENANT
 * - Development:
 *   - <slug>.localhost => TENANT (subdomain routing)
 *   - localhost / 127.0.0.1 with ?tenant=<slug> => TENANT (development fallback only)
 *   - localhost / 127.0.0.1 without tenant param => PLATFORM
 */
export function getTenantContext(searchString?: string): TenantContext {
  if (typeof window === 'undefined') {
    return {
      type: 'PLATFORM',
      isRootPlatform: true,
      isTenantApplication: false,
      tenantSlug: null,
      hostname: '',
    };
  }

  const hostname = window.location.hostname.toLowerCase();
  const searchParams = new URLSearchParams(searchString !== undefined ? searchString : window.location.search);
  const paramTenant = searchParams.get('tenant') || searchParams.get('app');

  const isLocalDev =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost');

  // 1. Production Subdomain of usesetu.com (e.g. abc-csc.usesetu.com)
  if (hostname.endsWith('.usesetu.com')) {
    const parts = hostname.split('.');
    const subdomain = parts[0];
    if (subdomain !== 'www' && subdomain !== 'app' && parts.length >= 3) {
      return {
        type: 'TENANT',
        isRootPlatform: false,
        isTenantApplication: true,
        tenantSlug: subdomain,
        hostname,
      };
    }
    // Root production domains (usesetu.com, www.usesetu.com, app.usesetu.com)
    return {
      type: 'PLATFORM',
      isRootPlatform: true,
      isTenantApplication: false,
      tenantSlug: null,
      hostname,
    };
  }

  // 2. Production Base Domain exact match
  if (hostname === 'usesetu.com' || hostname === 'www.usesetu.com') {
    return {
      type: 'PLATFORM',
      isRootPlatform: true,
      isTenantApplication: false,
      tenantSlug: null,
      hostname,
    };
  }

  // 3. Local Development Environment
  if (isLocalDev) {
    // 3a. Subdomain on localhost (e.g. abc.localhost)
    if (hostname.endsWith('.localhost')) {
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[0] !== 'localhost') {
        return {
          type: 'TENANT',
          isRootPlatform: false,
          isTenantApplication: true,
          tenantSlug: parts[0],
          hostname,
        };
      }
    }

    // 3b. Query Parameter Fallback (Development only)
    if (paramTenant) {
      return {
        type: 'TENANT',
        isRootPlatform: false,
        isTenantApplication: true,
        tenantSlug: paramTenant.toLowerCase().trim(),
        hostname,
      };
    }

    // 3c. Pure Localhost Root -> Platform
    return {
      type: 'PLATFORM',
      isRootPlatform: true,
      isTenantApplication: false,
      tenantSlug: null,
      hostname,
    };
  }

  // 4. Custom Domain (e.g. customdomain.com or mykendra.in)
  return {
    type: 'TENANT',
    isRootPlatform: false,
    isTenantApplication: true,
    tenantSlug: null,
    hostname,
  };
}

/**
 * Check if the frontend is currently running in a local development environment.
 */
export function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost')
  );
}

/**
 * Returns the public Citizen Portal URL for a tenant application:
 * - On Localhost / Development: http://localhost:5173/?tenant=<slug>
 * - On Production: https://<customDomain || slug.baseDomain>
 */
export function getTenantPublicUrl(slug: string, customOrPrimaryDomain?: string | null): string {
  if (!slug) return '/';
  if (typeof window === 'undefined') return `/?tenant=${slug}`;
  if (isLocalEnvironment()) {
    return `${window.location.protocol}//${window.location.host}/?tenant=${encodeURIComponent(slug)}`;
  }
  if (customOrPrimaryDomain && !customOrPrimaryDomain.endsWith('usesetu.com')) {
    return `https://${customOrPrimaryDomain}`;
  }
  const baseDomain = import.meta.env.VITE_BASE_DOMAIN || 'usesetu.com';
  return `https://${slug}.${baseDomain}`;
}

/**
 * Returns the Tenant Admin Console URL for a tenant application:
 * - On Localhost / Development: http://localhost:5173/admin?tenant=<slug>
 * - On Production: https://<customDomain || slug.baseDomain>/admin
 */
export function getTenantAdminUrl(slug: string, customOrPrimaryDomain?: string | null): string {
  if (!slug) return '/admin';
  if (typeof window === 'undefined') return `/admin?tenant=${slug}`;
  if (isLocalEnvironment()) {
    return `${window.location.protocol}//${window.location.host}/admin?tenant=${encodeURIComponent(slug)}`;
  }
  if (customOrPrimaryDomain && !customOrPrimaryDomain.endsWith('usesetu.com')) {
    return `https://${customOrPrimaryDomain}/admin`;
  }
  const baseDomain = import.meta.env.VITE_BASE_DOMAIN || 'usesetu.com';
  return `https://${slug}.${baseDomain}/admin`;
}


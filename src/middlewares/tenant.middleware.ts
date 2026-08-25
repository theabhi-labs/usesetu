import { Request, Response, NextFunction } from 'express';
import { tenantLocalStorage } from '../services/tenantContext.service';
import { DomainResolverService } from '../services/domainResolver.service';
import { ApiError } from '../utils/ApiError';

export const DEFAULT_TENANT_ID = '60d5ec4b1f6d3f2b4c8b4567'; // static default ObjectId

export const tenantResolver = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    // 1. Global routes that do not require tenant scoping by default
    const globalPrefixes = [
      '/health',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/verify-otp',
      '/api/v1/auth/forgot-password',
      '/api/v1/auth/reset-password',
      '/api/v1/auth/resend-otp',
      '/api/v1/platform',
      '/api/v1/public/application/context',
      '/api/v1/public/application/sitemap',
      '/api/v1/public/application/robots',
      '/sitemap.xml',
      '/robots.txt',
    ];

    const isGlobalRoute = globalPrefixes.some((prefix) => req.path.startsWith(prefix));

    // 2. Resolve domain context from Host header
    const rawHost = (req.headers['x-forwarded-host'] || req.headers.host || req.hostname) as string;
    let hostTenantId: string | undefined = undefined;

    if (rawHost) {
      const resolved = await DomainResolverService.resolveHostname(rawHost);
      if (resolved) {
        (req as any).application = resolved.application;
        (req as any).applicationDomain = resolved.domain;
        hostTenantId = String(resolved.tenant._id);
      }
    }

    if (isGlobalRoute && !hostTenantId) {
      req.tenantId = undefined;
      return next();
    }

    // 3. Resolve tenant ID from JWT user context
    const jwtTenantId = req.user && (req.user as any).tenantId ? String((req.user as any).tenantId) : undefined;

    // 4. Security Check: Strict Host vs JWT Tenant agreement
    if (jwtTenantId && hostTenantId && jwtTenantId !== hostTenantId) {
      throw ApiError.forbidden('Host and token tenant mismatch: Access denied to cross-tenant resources');
    }

    // 5. Final resolved tenant ID (strictly derived from host or JWT)
    const resolvedTenantId = hostTenantId || jwtTenantId || DEFAULT_TENANT_ID;

    req.tenantId = resolvedTenantId;

    if (resolvedTenantId) {
      tenantLocalStorage.run({ tenantId: resolvedTenantId }, () => {
        next();
      });
    } else {
      next();
    }
  } catch (error) {
    next(error);
  }
};

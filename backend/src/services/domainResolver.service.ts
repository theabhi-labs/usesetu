import mongoose from 'mongoose';
import { ApplicationDomain, DomainStatus, DomainType, IApplicationDomain } from '../models/applicationDomain.model';
import { ApplicationStatus } from '../models/application.model';
import { Tenant } from '../models/tenant.model';
import { DomainNormalizationService } from './domainNormalization.service';
import { env } from '../config/env';

export interface ResolvedDomainContext {
  domain: IApplicationDomain;
  application: any;
  tenant: any;
}

export class DomainResolverService {
  /**
   * Cleans and normalizes incoming hostnames (removes protocol, path, query, port, lowercase, trims).
   */
  static normalizeHostname(rawHost: string): string {
    return DomainNormalizationService.normalize(rawHost);
  }

  /**
   * Generates the platform default domain for a given slug.
   * Example: "sharma-center" -> "sharma-center.usesetu.com"
   */
  static generateDefaultHostname(slug: string): string {
    const cleanSlug = slug.trim().toLowerCase();
    return `${cleanSlug}.${env.PLATFORM_BASE_DOMAIN}`;
  }

  /**
   * Determines if the given hostname is the root SaaS platform domain.
   */
  static isPlatformHostname(rawHost: string): boolean {
    const hostname = this.normalizeHostname(rawHost);
    const baseDomain = (env.PLATFORM_BASE_DOMAIN || 'usesetu.com').toLowerCase();
    return (
      hostname === baseDomain ||
      hostname === `www.${baseDomain}` ||
      hostname === `app.${baseDomain}` ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1'
    );
  }

  /**
   * Resolves an incoming hostname to its associated ApplicationDomain, Application, and Tenant.
   * Only ACTIVE domains serve live tenant traffic.
   */
  static async resolveHostname(rawHost: string): Promise<ResolvedDomainContext | null> {
    const hostname = this.normalizeHostname(rawHost);
    if (!hostname) return null;

    // 1. Direct lookup in ApplicationDomain for ACTIVE domains
    let domainDoc = await ApplicationDomain.findOne({
      hostname,
      status: DomainStatus.ACTIVE,
    }).populate('applicationId');

    // 2. If running locally (e.g. "subdomain.localhost" or "subdomain.127.0.0.1.nip.io"),
    // check if it matches the default platform pattern
    if (!domainDoc && (hostname.endsWith('.localhost') || hostname.includes('localhost'))) {
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[0] !== 'localhost') {
        const slug = parts[0];
        const defaultHost = this.generateDefaultHostname(slug);
        domainDoc = await ApplicationDomain.findOne({
          hostname: defaultHost,
          status: DomainStatus.ACTIVE,
        }).populate('applicationId');
      }
    }

    if (!domainDoc || !domainDoc.applicationId) {
      return null;
    }

    const application: any = domainDoc.applicationId;
    if (application.status !== ApplicationStatus.ACTIVE && application.status !== ApplicationStatus.PROVISIONING) {
      const tenant = await Tenant.findById(application.tenantId);
      return {
        domain: domainDoc,
        application,
        tenant,
      };
    }

    const tenant = await Tenant.findById(application.tenantId);
    if (!tenant) {
      return null;
    }

    return {
      domain: domainDoc,
      application,
      tenant,
    };
  }

  /**
   * Retrieves the primary domain for an application.
   */
  static async getPrimaryDomain(applicationId: string | mongoose.Types.ObjectId): Promise<string | null> {
    const appObjectId = new mongoose.Types.ObjectId(String(applicationId));

    // 1. Check for active primary domain
    const primary = await ApplicationDomain.findOne({
      applicationId: appObjectId,
      status: DomainStatus.ACTIVE,
      isPrimary: true,
    });

    if (primary) return primary.hostname;

    // 2. Fallback to any active domain
    const anyActive = await ApplicationDomain.findOne({
      applicationId: appObjectId,
      status: DomainStatus.ACTIVE,
    }).sort({ type: 1, createdAt: 1 });

    return anyActive ? anyActive.hostname : null;
  }

  /**
   * Creates or ensures default domain for an application.
   */
  static async createDefaultDomain(applicationId: string | mongoose.Types.ObjectId, slug: string) {
    const hostname = this.generateDefaultHostname(slug);

    const existing = await ApplicationDomain.findOne({ hostname });
    if (existing) {
      if (String(existing.applicationId) === String(applicationId)) {
        return existing;
      }
      throw new Error(`Hostname "${hostname}" is already assigned to another application.`);
    }

    return await ApplicationDomain.create({
      applicationId: new mongoose.Types.ObjectId(String(applicationId)),
      hostname,
      type: DomainType.DEFAULT,
      status: DomainStatus.ACTIVE,
      isPrimary: true,
    });
  }
}

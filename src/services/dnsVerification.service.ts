import dns from 'dns/promises';
import mongoose from 'mongoose';
import { ApplicationDomain, DomainStatus, SslStatus, VerificationMethod, IApplicationDomain } from '../models/applicationDomain.model';
import { DomainNormalizationService } from './domainNormalization.service';
import { DomainProvisioningService } from './domainProvisioning.service';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export interface DnsCheckResult {
  verified: boolean;
  method: 'cname' | 'txt';
  recordsFound: string[];
  code?: 'DNS_NOT_FOUND' | 'CNAME_NOT_FOUND' | 'TXT_NOT_FOUND' | 'WRONG_TARGET' | 'WRONG_TOKEN' | 'DNS_PROPAGATION_PENDING' | 'INVALID_DOMAIN';
  reason?: string;
}

export interface VerificationInstructions {
  domain: string;
  isApex: boolean;
  primaryMethod: 'cname' | 'txt';
  cname: {
    type: 'CNAME';
    host: string;
    target: string;
    recommended: boolean;
  };
  txt: {
    type: 'TXT';
    host: string;
    value: string;
    token: string;
  };
  guidance: string;
}

export class DnsVerificationService {
  /**
   * Optional mock DNS resolver for automated test suites and local testing.
   */
  private static mockResolver: {
    cnameResolver?: (hostname: string) => Promise<string[]>;
    txtResolver?: (hostname: string) => Promise<string[][]>;
  } | null = null;

  /**
   * Set custom mock DNS resolver for test environments.
   */
  static setMockResolver(resolver: {
    cnameResolver?: (hostname: string) => Promise<string[]>;
    txtResolver?: (hostname: string) => Promise<string[][]>;
  } | null): void {
    this.mockResolver = resolver;
  }

  /**
   * Generates DNS configuration instructions for a customer's domain.
   */
  static getVerificationInstructions(domain: IApplicationDomain): VerificationInstructions {
    const hostname = DomainNormalizationService.normalize(domain.hostname);
    const labels = hostname.split('.');
    const isApex = labels.length <= 2;

    // Subdomain host prefix (e.g. "www" for "www.example.com", or "portal" for "portal.center.in")
    const subHost = isApex ? '@' : labels[0];
    const expectedCnameTarget = domain.verificationExpectedValue || env.CUSTOM_DOMAIN_CNAME_TARGET || 'domains.usesetu.com';
    const prefix = env.CUSTOM_DOMAIN_VERIFICATION_PREFIX || '_usesetu-verification';
    const txtHost = isApex ? prefix : `${prefix}.${subHost}`;
    const token = domain.verificationToken || '';

    return {
      domain: hostname,
      isApex,
      primaryMethod: isApex ? 'txt' : 'cname',
      cname: {
        type: 'CNAME',
        host: subHost,
        target: expectedCnameTarget,
        recommended: !isApex,
      },
      txt: {
        type: 'TXT',
        host: txtHost,
        value: `usesetu-verification=${token}`,
        token,
      },
      guidance: isApex
        ? 'For apex/root domains (e.g. example.com), add a TXT verification record. Some DNS providers like Cloudflare also support CNAME Flattening / ALIAS records pointing to domains.usesetu.com.'
        : `Add a CNAME record at your DNS provider pointing host "${subHost}" to target "${expectedCnameTarget}".`,
    };
  }

  /**
   * Queries DNS for CNAME records pointing to the expected UseSetu target.
   */
  static async verifyCname(hostname: string, expectedTarget?: string): Promise<DnsCheckResult> {
    const target = (expectedTarget || env.CUSTOM_DOMAIN_CNAME_TARGET || 'domains.usesetu.com').toLowerCase().replace(/\.+$/, '');
    const cleanHost = DomainNormalizationService.normalize(hostname);

    try {
      let records: string[] = [];

      if (this.mockResolver?.cnameResolver) {
        records = await this.mockResolver.cnameResolver(cleanHost);
      } else {
        records = await dns.resolveCname(cleanHost);
      }

      const normalizedRecords = records.map((r) => r.toLowerCase().replace(/\.+$/, '').trim());

      if (normalizedRecords.length === 0) {
        return {
          verified: false,
          method: 'cname',
          recordsFound: [],
          code: 'CNAME_NOT_FOUND',
          reason: `No CNAME records found for "${cleanHost}". Please ensure DNS records are saved and propagated.`,
        };
      }

      const hasMatch = normalizedRecords.some((r) => r === target || r.endsWith(`.${target}`) || r === `custom.${env.PLATFORM_BASE_DOMAIN}`);

      if (hasMatch) {
        return {
          verified: true,
          method: 'cname',
          recordsFound: normalizedRecords,
        };
      }

      return {
        verified: false,
        method: 'cname',
        recordsFound: normalizedRecords,
        code: 'WRONG_TARGET',
        reason: `CNAME record points to "${normalizedRecords.join(', ')}" instead of "${target}".`,
      };
    } catch (err: any) {
      if (err.code === 'ENODATA' || err.code === 'ENOTFOUND' || err.code === 'ESERVFAIL') {
        return {
          verified: false,
          method: 'cname',
          recordsFound: [],
          code: 'DNS_PROPAGATION_PENDING',
          reason: `DNS records for "${cleanHost}" have not propagated yet. DNS changes can take a few minutes.`,
        };
      }

      return {
        verified: false,
        method: 'cname',
        recordsFound: [],
        code: 'DNS_NOT_FOUND',
        reason: err.message || 'DNS query failed',
      };
    }
  }

  /**
   * Queries DNS for TXT verification records matching the expected token.
   */
  static async verifyTxt(hostname: string, expectedToken: string): Promise<DnsCheckResult> {
    const cleanHost = DomainNormalizationService.normalize(hostname);
    const prefix = env.CUSTOM_DOMAIN_VERIFICATION_PREFIX || '_usesetu-verification';
    const txtHostname = `${prefix}.${cleanHost}`;

    try {
      let rawRecords: string[][] = [];

      if (this.mockResolver?.txtResolver) {
        rawRecords = await this.mockResolver.txtResolver(txtHostname);
      } else {
        try {
          rawRecords = await dns.resolveTxt(txtHostname);
        } catch {
          // Fallback to querying apex domain directly if prefix subdomain fails
          rawRecords = await dns.resolveTxt(cleanHost);
        }
      }

      const flattenedRecords = rawRecords.map((chunks) => chunks.join(''));

      if (flattenedRecords.length === 0) {
        return {
          verified: false,
          method: 'txt',
          recordsFound: [],
          code: 'TXT_NOT_FOUND',
          reason: `No TXT verification records found at "${txtHostname}".`,
        };
      }

      const hasMatch = flattenedRecords.some((txt) => {
        const cleanTxt = txt.trim();
        return (
          cleanTxt === expectedToken ||
          cleanTxt === `usesetu-verification=${expectedToken}` ||
          cleanTxt === `usesetu-verify=${expectedToken}`
        );
      });

      if (hasMatch) {
        return {
          verified: true,
          method: 'txt',
          recordsFound: flattenedRecords,
        };
      }

      return {
        verified: false,
        method: 'txt',
        recordsFound: flattenedRecords,
        code: 'WRONG_TOKEN',
        reason: `TXT verification token does not match the expected value.`,
      };
    } catch (err: any) {
      return {
        verified: false,
        method: 'txt',
        recordsFound: [],
        code: 'DNS_PROPAGATION_PENDING',
        reason: `TXT record verification failed: ${err.message || 'DNS lookup pending'}.`,
      };
    }
  }

  /**
   * Verifies an ApplicationDomain record server-side with rate-limiting and SSL lifecycle progression.
   */
  static async verifyDomain(domainId: string | mongoose.Types.ObjectId): Promise<{
    domain: IApplicationDomain;
    checkResult: DnsCheckResult;
  }> {
    const domain = await ApplicationDomain.findById(domainId);
    if (!domain) {
      throw ApiError.notFound('Domain not found');
    }

    if (domain.status === DomainStatus.DISABLED) {
      throw ApiError.badRequest('Cannot verify a disabled domain. Please re-enable or re-add the domain.');
    }

    // Rate Limiting: max 5 attempts per domain per 10 minutes
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    if (domain.lastVerificationAt && domain.lastVerificationAt > tenMinutesAgo) {
      if (domain.verificationAttempts >= 5) {
        const waitMinutes = Math.ceil((domain.lastVerificationAt.getTime() + 10 * 60 * 1000 - now.getTime()) / 60000);
        throw ApiError.badRequest(
          `Verification rate limit exceeded. You have made ${domain.verificationAttempts} attempts. Please wait ${waitMinutes} minute(s) before trying again.`,
        );
      }
      domain.verificationAttempts += 1;
    } else {
      // Reset attempt counter after 10-minute window
      domain.verificationAttempts = 1;
    }

    domain.lastVerificationAt = now;
    domain.status = DomainStatus.VERIFYING;
    await domain.save();

    // 1. Run DNS Verification
    let checkResult: DnsCheckResult;
    if (domain.verificationMethod === VerificationMethod.TXT) {
      checkResult = await this.verifyTxt(domain.hostname, domain.verificationToken || '');
    } else {
      checkResult = await this.verifyCname(domain.hostname, domain.verificationExpectedValue);
      // Fallback: If CNAME failed on an apex domain, try TXT verification as well
      if (!checkResult.verified && domain.verificationToken) {
        const txtResult = await this.verifyTxt(domain.hostname, domain.verificationToken);
        if (txtResult.verified) {
          checkResult = txtResult;
        }
      }
    }

    if (checkResult.verified) {
      domain.status = DomainStatus.VERIFIED;
      domain.verifiedAt = now;
      domain.verificationError = undefined;
      domain.sslStatus = SslStatus.PROVISIONING;
      await domain.save();

      // 2. Trigger SSL Provisioning & Edge Routing
      try {
        const sslResult = await DomainProvisioningService.requestCertificate(domain.hostname);
        domain.sslStatus = sslResult.sslStatus;
        domain.sslProvider = sslResult.sslProvider;

        if (sslResult.ready && sslResult.sslStatus === SslStatus.ACTIVE) {
          domain.status = DomainStatus.ACTIVE;
          domain.activatedAt = now;
        }
      } catch (sslErr: any) {
        domain.sslStatus = SslStatus.FAILED;
        domain.verificationError = `SSL provisioning failed: ${sslErr.message}`;
      }

      await domain.save();
    } else {
      domain.status = DomainStatus.FAILED;
      domain.verificationError = checkResult.reason || 'DNS verification failed';
      await domain.save();
    }

    return {
      domain,
      checkResult,
    };
  }
}

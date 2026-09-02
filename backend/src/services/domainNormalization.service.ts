import { env } from '../config/env';

export interface DomainValidationResult {
  valid: boolean;
  hostname: string;
  isApex: boolean;
  reason?: string;
}

export class DomainNormalizationService {
  /**
   * Reserved UseSetu core domains and infrastructure hosts that customers cannot claim.
   */
  private static readonly RESERVED_HOSTNAMES = new Set([
    'usesetu.com',
    'www.usesetu.com',
    'api.usesetu.com',
    'admin.usesetu.com',
    'platform.usesetu.com',
    'dashboard.usesetu.com',
    'app.usesetu.com',
    'cdn.usesetu.com',
    'static.usesetu.com',
    'custom.usesetu.com',
    'domains.usesetu.com',
    'assets.usesetu.com',
    'auth.usesetu.com',
    'mail.usesetu.com',
    'smtp.usesetu.com',
  ]);

  /**
   * Cleans and normalizes any domain/URL input into a standard FQDN hostname.
   * e.g. "  https://WWW.MyCenter.IN:443/home?ref=1#top  " -> "www.mycenter.in"
   */
  static normalize(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let cleaned = input.trim().toLowerCase();

    // 1. Remove protocol if present
    cleaned = cleaned.replace(/^(?:https?:\/\/|\/\/)/i, '');

    // 2. Remove path, query string, and hash fragment
    const pathIdx = cleaned.indexOf('/');
    if (pathIdx !== -1) {
      cleaned = cleaned.substring(0, pathIdx);
    }
    const queryIdx = cleaned.indexOf('?');
    if (queryIdx !== -1) {
      cleaned = cleaned.substring(0, queryIdx);
    }
    const hashIdx = cleaned.indexOf('#');
    if (hashIdx !== -1) {
      cleaned = cleaned.substring(0, hashIdx);
    }

    // 3. Remove port if present
    const colonIdx = cleaned.indexOf(':');
    if (colonIdx !== -1) {
      cleaned = cleaned.substring(0, colonIdx);
    }

    // 4. Remove leading/trailing dots and whitespace
    cleaned = cleaned.replace(/^\.+|\.+$/g, '').trim();

    return cleaned;
  }

  /**
   * Checks if a normalized hostname is a reserved platform domain or ends with .usesetu.com.
   */
  static isReservedDomain(hostname: string): boolean {
    const norm = this.normalize(hostname);
    if (!norm) return true;

    if (this.RESERVED_HOSTNAMES.has(norm)) {
      return true;
    }

    const baseDomain = (env.PLATFORM_BASE_DOMAIN || 'usesetu.com').toLowerCase().trim();

    // Exactly the base domain
    if (norm === baseDomain || norm === `www.${baseDomain}`) {
      return true;
    }

    // Any subdomain on the platform base domain (e.g. "xyz.usesetu.com")
    if (norm.endsWith(`.${baseDomain}`)) {
      return true;
    }

    return false;
  }

  /**
   * Validates a hostname according to standard RFC 1035 / RFC 1123 DNS naming rules.
   */
  static validateCustomDomain(input: string): DomainValidationResult {
    const hostname = this.normalize(input);

    if (!hostname) {
      return { valid: false, hostname: '', isApex: false, reason: 'Domain name is required.' };
    }

    // Check maximum hostname length (253 characters)
    if (hostname.length > 253) {
      return { valid: false, hostname, isApex: false, reason: 'Domain name exceeds maximum length of 253 characters.' };
    }

    // Reject wildcards
    if (hostname.includes('*')) {
      return { valid: false, hostname, isApex: false, reason: 'Wildcard domains are not supported.' };
    }

    // Reject IP addresses (IPv4 & IPv6)
    const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (ipv4Regex.test(hostname)) {
      return { valid: false, hostname, isApex: false, reason: 'IP addresses cannot be used as custom domains.' };
    }
    if (hostname.includes(':') || hostname.startsWith('[') || hostname.endsWith(']')) {
      return { valid: false, hostname, isApex: false, reason: 'IPv6 addresses cannot be used as custom domains.' };
    }

    // Reject localhost / local network domains for custom domains
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return { valid: false, hostname, isApex: false, reason: 'Local network hostnames cannot be added as custom domains.' };
    }

    // Check reserved platform domains
    if (this.isReservedDomain(hostname)) {
      return {
        valid: false,
        hostname,
        isApex: false,
        reason: 'This domain or subdomain is reserved by the UseSetu platform infrastructure.',
      };
    }

    // Validate domain labels (each label 1-63 chars, alphanumeric with internal hyphens)
    const labels = hostname.split('.');
    if (labels.length < 2) {
      return { valid: false, hostname, isApex: false, reason: 'Domain must include a valid Top-Level Domain (e.g. .in, .com, .org).' };
    }

    const labelRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    for (const label of labels) {
      if (!label || label.length > 63 || !labelRegex.test(label)) {
        return {
          valid: false,
          hostname,
          isApex: false,
          reason: `Invalid domain segment "${label}". Domain labels must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.`,
        };
      }
    }

    // Check Top-Level Domain (TLD should not be purely numeric)
    const tld = labels[labels.length - 1];
    if (/^[0-9]+$/.test(tld) || tld.length < 2) {
      return { valid: false, hostname, isApex: false, reason: 'Invalid Top-Level Domain (TLD).' };
    }

    // Determine if apex domain (e.g. "example.com" has 2 labels, whereas "www.example.com" has 3)
    // Note: for ccTLDs like ".co.in", 3 labels might be apex, but generally subdomains have 3+ labels.
    const isApex = labels.length === 2;

    return {
      valid: true,
      hostname,
      isApex,
    };
  }
}

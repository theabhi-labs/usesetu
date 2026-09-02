import { SslStatus } from '../models/applicationDomain.model';

export interface DomainProvisionResult {
  sslStatus: SslStatus;
  ready: boolean;
  sslProvider: string;
  message?: string;
}

export interface DomainInfrastructureProvider {
  provisionDomain(hostname: string): Promise<DomainProvisionResult>;
  removeDomain(hostname: string): Promise<boolean>;
  getDomainStatus(hostname: string): Promise<DomainProvisionResult>;
}

/**
 * Mock provider for testing and development environments.
 * Returns successful SSL provisioning instantly.
 */
export class MockDomainInfrastructureProvider implements DomainInfrastructureProvider {
  async provisionDomain(hostname: string): Promise<DomainProvisionResult> {
    return {
      sslStatus: SslStatus.ACTIVE,
      ready: true,
      sslProvider: 'mock-ssl',
      message: `SSL certificate generated for ${hostname}`,
    };
  }

  async removeDomain(_hostname: string): Promise<boolean> {
    return true;
  }

  async getDomainStatus(hostname: string): Promise<DomainProvisionResult> {
    return {
      sslStatus: SslStatus.ACTIVE,
      ready: true,
      sslProvider: 'mock-ssl',
      message: `SSL certificate active for ${hostname}`,
    };
  }
}

/**
 * Service managing SSL certificate provisioning and edge routing.
 */
export class DomainProvisioningService {
  private static provider: DomainInfrastructureProvider = new MockDomainInfrastructureProvider();

  /**
   * Set custom provider (e.g. CloudflareCustomHostnameProvider).
   */
  static setProvider(newProvider: DomainInfrastructureProvider): void {
    this.provider = newProvider;
  }

  /**
   * Request SSL certificate provisioning for a verified custom domain.
   */
  static async requestCertificate(hostname: string): Promise<DomainProvisionResult> {
    return await this.provider.provisionDomain(hostname);
  }

  /**
   * Check certificate and edge routing status for a domain.
   */
  static async checkCertificateStatus(hostname: string): Promise<DomainProvisionResult> {
    return await this.provider.getDomainStatus(hostname);
  }

  /**
   * Deactivate and remove domain from edge proxy / CDN.
   */
  static async deactivateDomain(hostname: string): Promise<boolean> {
    return await this.provider.removeDomain(hostname);
  }
}

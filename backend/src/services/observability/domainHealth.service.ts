import { ApplicationDomain, DomainStatus, SslStatus } from '../../models/applicationDomain.model';

export interface DomainHealthReport {
  summary: {
    totalDomains: number;
    activeDomains: number;
    pendingVerification: number;
    failedVerification: number;
    sslPending: number;
    sslActive: number;
    sslFailed: number;
    disabledDomains: number;
  };
  timestamp: string;
}

export class DomainHealthService {
  /**
   * Aggregates custom domain and SSL health across the platform.
   */
  static async getDomainHealth(): Promise<DomainHealthReport> {
    const [
      totalDomains,
      activeDomains,
      pendingVerification,
      failedVerification,
      sslPending,
      sslActive,
      sslFailed,
      disabledDomains,
    ] = await Promise.all([
      ApplicationDomain.countDocuments(),
      ApplicationDomain.countDocuments({
        status: { $in: [DomainStatus.ACTIVE, DomainStatus.VERIFIED] },
        sslStatus: SslStatus.ACTIVE,
      }),
      ApplicationDomain.countDocuments({
        status: { $in: [DomainStatus.PENDING, DomainStatus.VERIFYING] },
      }),
      ApplicationDomain.countDocuments({
        status: DomainStatus.FAILED,
      }),
      ApplicationDomain.countDocuments({
        sslStatus: { $in: [SslStatus.PENDING, SslStatus.PROVISIONING] },
      }),
      ApplicationDomain.countDocuments({
        sslStatus: SslStatus.ACTIVE,
      }),
      ApplicationDomain.countDocuments({
        sslStatus: SslStatus.FAILED,
      }),
      ApplicationDomain.countDocuments({
        status: DomainStatus.DISABLED,
      }),
    ]);

    return {
      summary: {
        totalDomains,
        activeDomains,
        pendingVerification,
        failedVerification,
        sslPending,
        sslActive,
        sslFailed,
        disabledDomains,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

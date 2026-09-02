import { Application, ApplicationStatus } from '../../models/application.model';
import { Account } from '../../models/account.model';

export interface ApplicationHealthReport {
  summary: {
    totalApplications: number;
    active: number;
    provisioning: number;
    suspended: number;
    archived: number;
    totalAccounts: number;
  };
  recentApplications: {
    id: string;
    name: string;
    slug: string;
    status: ApplicationStatus;
    createdAt: Date;
  }[];
  timestamp: string;
}

export class ApplicationHealthService {
  /**
   * Aggregates application lifecycle states and account totals
   */
  static async getApplicationHealth(): Promise<ApplicationHealthReport> {
    const [
      totalApplications,
      active,
      provisioning,
      suspended,
      archived,
      totalAccounts,
      recentApps,
    ] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ status: ApplicationStatus.ACTIVE }),
      Application.countDocuments({ status: ApplicationStatus.PROVISIONING }),
      Application.countDocuments({ status: ApplicationStatus.SUSPENDED }),
      Application.countDocuments({ status: ApplicationStatus.ARCHIVED }),
      Account.countDocuments(),
      Application.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name slug status createdAt')
        .lean(),
    ]);

    return {
      summary: {
        totalApplications,
        active,
        provisioning,
        suspended,
        archived,
        totalAccounts,
      },
      recentApplications: recentApps.map((a: any) => ({
        id: String(a._id),
        name: a.name,
        slug: a.slug,
        status: a.status,
        createdAt: a.createdAt,
      })),
      timestamp: new Date().toISOString(),
    };
  }
}

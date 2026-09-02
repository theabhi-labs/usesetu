import mongoose from 'mongoose';
import { ApplicationDomain, DomainStatus } from '../models/applicationDomain.model';
import { Application } from '../models/application.model';
import { env } from '../config/env';

export class ApplicationUrlService {
  /**
   * Retrieves the full primary base URL for an application (e.g. "https://www.mydigitalcenter.in" or "https://sharma.usesetu.com").
   */
  static async getPrimaryApplicationUrl(applicationId: string | mongoose.Types.ObjectId): Promise<string> {
    const appObjectId = new mongoose.Types.ObjectId(String(applicationId));
    const protocol = env.PLATFORM_PROTOCOL || 'https';

    // 1. Look for active primary domain
    const primaryDomain = await ApplicationDomain.findOne({
      applicationId: appObjectId,
      isPrimary: true,
      status: DomainStatus.ACTIVE,
    });

    if (primaryDomain) {
      return `${protocol}://${primaryDomain.hostname}`;
    }

    // 2. Fallback to any active domain for this application
    const anyActiveDomain = await ApplicationDomain.findOne({
      applicationId: appObjectId,
      status: DomainStatus.ACTIVE,
    }).sort({ type: 1, createdAt: 1 });

    if (anyActiveDomain) {
      return `${protocol}://${anyActiveDomain.hostname}`;
    }

    // 3. Fallback to default generated slug hostname
    const app = await Application.findById(appObjectId);
    if (app?.slug) {
      return `${protocol}://${app.slug}.${env.PLATFORM_BASE_DOMAIN}`;
    }

    return `${protocol}://${env.PLATFORM_BASE_DOMAIN}`;
  }

  /**
   * Generates a tenant-scoped customer request tracking URL.
   */
  static async getRequestTrackingUrl(applicationId: string | mongoose.Types.ObjectId, applicationNumber: string): Promise<string> {
    const baseUrl = await this.getPrimaryApplicationUrl(applicationId);
    return `${baseUrl}/track/${encodeURIComponent(applicationNumber)}`;
  }

  /**
   * Generates a tenant-scoped customer appointment URL.
   */
  static async getAppointmentUrl(applicationId: string | mongoose.Types.ObjectId, appointmentId: string): Promise<string> {
    const baseUrl = await this.getPrimaryApplicationUrl(applicationId);
    return `${baseUrl}/appointments/${encodeURIComponent(appointmentId)}`;
  }

  /**
   * Generates dynamic XML sitemap for a tenant application.
   */
  static async generateSitemapXml(applicationId: string | mongoose.Types.ObjectId, routes: string[] = ['/', '/track', '/queue-display']): Promise<string> {
    const baseUrl = await this.getPrimaryApplicationUrl(applicationId);
    const lastMod = new Date().toISOString().split('T')[0];

    const urlsXml = routes
      .map(
        (route) => `  <url>
    <loc>${baseUrl}${route}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
  }

  /**
   * Generates tenant-aware robots.txt pointing to the tenant's primary domain sitemap.
   */
  static async generateRobotsTxt(applicationId: string | mongoose.Types.ObjectId): Promise<string> {
    const baseUrl = await this.getPrimaryApplicationUrl(applicationId);
    return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /portal/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
  }
}

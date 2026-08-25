import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { DomainResolverService } from '../services/domainResolver.service';
import { Application, ApplicationStatus } from '../models/application.model';
import { ApplicationTemplate } from '../models/applicationTemplate.model';
import { WebsiteSetting } from '../models/websiteSetting.model';
import { tenantLocalStorage } from '../services/tenantContext.service';

import { ApplicationUrlService } from '../services/applicationUrl.service';
import { DomainType } from '../models/applicationDomain.model';

export const getPublicApplicationContext = asyncHandler(async (req: Request, res: Response) => {
  const rawHost = (req.headers['x-forwarded-host'] || req.headers.host || req.hostname) as string;
  const slugQuery = req.query.slug as string | undefined;

  let application: any = null;
  let tenantId: string | null = null;
  let hostname: string = rawHost;
  let domainDoc: any = null;

  // 1. Try resolving via hostname first
  const resolved = await DomainResolverService.resolveHostname(rawHost);
  if (resolved) {
    application = resolved.application;
    tenantId = String(resolved.tenant._id);
    domainDoc = resolved.domain;
    hostname = resolved.domain.hostname;
  } else if (slugQuery) {
    // Fallback lookup via slug for local development or direct testing
    application = await Application.findOne({ slug: slugQuery.toLowerCase().trim() });
    if (application) {
      tenantId = String(application.tenantId);
      hostname = DomainResolverService.generateDefaultHostname(application.slug);
    }
  }

  if (!application || !tenantId) {
    throw ApiError.notFound('Application not found for the requested address');
  }

  // 2. Handle non-active application statuses safely
  if (application.status === ApplicationStatus.PROVISIONING) {
    res.status(200).json(
      new ApiResponse(
        200,
        {
          application: {
            name: application.name,
            slug: application.slug,
            status: ApplicationStatus.PROVISIONING,
          },
          message: 'Your application is being prepared...',
        },
        'Application is provisioning',
      ),
    );
    return;
  }

  if (application.status === ApplicationStatus.SUSPENDED) {
    res.status(200).json(
      new ApiResponse(
        200,
        {
          application: {
            name: application.name,
            slug: application.slug,
            status: ApplicationStatus.SUSPENDED,
          },
          message: 'This application is temporarily unavailable.',
        },
        'Application suspended',
      ),
    );
    return;
  }

  if (application.status === ApplicationStatus.EXPIRED) {
    res.status(200).json(
      new ApiResponse(
        200,
        {
          application: {
            name: application.name,
            slug: application.slug,
            status: ApplicationStatus.EXPIRED,
          },
          message: 'Application subscription has expired.',
        },
        'Application expired',
      ),
    );
    return;
  }

  if (application.status === ApplicationStatus.FAILED) {
    res.status(200).json(
      new ApiResponse(
        200,
        {
          application: {
            name: application.name,
            slug: application.slug,
            status: ApplicationStatus.FAILED,
          },
          message: 'Application setup failed. Please contact support.',
        },
        'Application setup failed',
      ),
    );
    return;
  }

  // 3. For Active applications, fetch template metadata, branding, and primary canonical URL
  const template = await ApplicationTemplate.findById(application.templateId).select(
    'name slug category description version',
  );

  const primaryDomain = await DomainResolverService.getPrimaryDomain(application._id);
  const canonicalUrl = await ApplicationUrlService.getPrimaryApplicationUrl(application._id);

  let websiteSetting: any = null;
  await tenantLocalStorage.run({ tenantId }, async () => {
    websiteSetting = await WebsiteSetting.findOne({ _id: tenantId }).lean();
  });

  const publicData = {
    application: {
      id: application._id,
      name: application.name,
      slug: application.slug,
      status: application.status,
    },
    domain: {
      hostname,
      primaryDomain: primaryDomain || hostname,
      canonicalUrl,
      type: domainDoc?.type || DomainType.DEFAULT,
      isPrimary: domainDoc?.isPrimary ?? true,
    },
    template: template
      ? {
          name: template.name,
          slug: template.slug,
          category: template.category,
          description: template.description,
        }
      : null,
    branding: websiteSetting
      ? {
          websiteName: websiteSetting.websiteName || application.name,
          cscName: websiteSetting.cscName || application.name,
          tagline: websiteSetting.tagline,
          description: websiteSetting.description,
          logoUrl: websiteSetting.logoUrl,
          darkLogoUrl: websiteSetting.darkLogoUrl,
          faviconUrl: websiteSetting.faviconUrl,
          theme: websiteSetting.theme,
          contact: websiteSetting.contact,
          socialLinks: websiteSetting.socialLinks,
          businessHours: websiteSetting.businessHours,
          maintenanceMode: websiteSetting.maintenanceMode?.enabled ? true : false,
        }
      : {
          websiteName: application.name,
          cscName: application.name,
          theme: {
            primaryColor: '#FF6700',
            secondaryColor: '#0D0D0D',
            accentColor: '#FFB800',
            borderRadius: '8px',
            fontFamily: 'Inter, sans-serif',
          },
        },
  };

  res.status(200).json(new ApiResponse(200, publicData, 'Public application context retrieved successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/public/application/sitemap & /sitemap.xml
// ---------------------------------------------------------------------------
export const getPublicApplicationSitemap = asyncHandler(async (req: Request, res: Response) => {
  const rawHost = (req.headers['x-forwarded-host'] || req.headers.host || req.hostname) as string;
  const slugQuery = req.query.slug as string | undefined;

  let applicationId: string | null = null;
  const resolved = await DomainResolverService.resolveHostname(rawHost);

  if (resolved) {
    applicationId = String(resolved.application._id);
  } else if (slugQuery) {
    const app = await Application.findOne({ slug: slugQuery.toLowerCase().trim() });
    if (app) applicationId = String(app._id);
  }

  if (!applicationId) {
    throw ApiError.notFound('Application not found');
  }

  const sitemapXml = await ApplicationUrlService.generateSitemapXml(applicationId);
  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(sitemapXml);
});

// ---------------------------------------------------------------------------
// GET /api/v1/public/application/robots & /robots.txt
// ---------------------------------------------------------------------------
export const getPublicApplicationRobots = asyncHandler(async (req: Request, res: Response) => {
  const rawHost = (req.headers['x-forwarded-host'] || req.headers.host || req.hostname) as string;
  const slugQuery = req.query.slug as string | undefined;

  let applicationId: string | null = null;
  const resolved = await DomainResolverService.resolveHostname(rawHost);

  if (resolved) {
    applicationId = String(resolved.application._id);
  } else if (slugQuery) {
    const app = await Application.findOne({ slug: slugQuery.toLowerCase().trim() });
    if (app) applicationId = String(app._id);
  }

  if (!applicationId) {
    throw ApiError.notFound('Application not found');
  }

  const robotsTxt = await ApplicationUrlService.generateRobotsTxt(applicationId);
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(robotsTxt);
});

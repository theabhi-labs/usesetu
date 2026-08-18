import { z } from 'zod';
import { PageType } from '../models/page.model';
import { AnnouncementType } from '../models/announcement.model';

// ── Website settings ─────────────────────────────────────────────────
export const updateWebsiteSettingSchema = z.object({
  body: z.object({
    websiteName: z.string().optional(),
    cscName: z.string().optional(),
    tagline: z.string().optional(),
    description: z.string().optional(),
    logoUrl: z.string().optional(),
    darkLogoUrl: z.string().optional(),
    faviconUrl: z.string().optional(),
    defaultLanguage: z.string().optional(),
    timezone: z.string().optional(),
    currency: z.string().optional(),
    dateFormat: z.string().optional(),
    timeFormat: z.string().optional(),
    contact: z
      .object({
        address: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        googleMapEmbedUrl: z.string().optional(),
      })
      .optional(),
    businessProfile: z
      .object({
        ownerName: z.string().optional(),
        registrationNumber: z.string().optional(),
        gstNumber: z.string().optional(),
        panNumber: z.string().optional(),
      })
      .optional(),
    theme: z
      .object({
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        accentColor: z.string().optional(),
        borderRadius: z.string().optional(),
        fontFamily: z.string().optional(),
      })
      .optional(),
    seo: z
      .object({
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        metaKeywords: z.array(z.string()).optional(),
        ogImage: z.string().optional(),
      })
      .optional(),
    socialLinks: z.record(z.string(), z.string()).optional(),
    businessHours: z
      .array(
        z.object({
          dayOfWeek: z.number().min(0).max(6),
          isOpen: z.boolean().optional(),
          startTime: z.string(),
          endTime: z.string(),
        }),
      )
      .optional(),
    holidays: z.array(z.object({ date: z.string(), label: z.string() })).optional(),
  }),
});

export const toggleMaintenanceSchema = z.object({
  body: z.object({
    enabled: z.boolean(),
    message: z.string().optional(),
    estimatedTime: z.string().optional(),
    allowedIps: z.array(z.string()).optional(),
  }),
});

// ── Menu ──────────────────────────────────────────────────────────────
export const upsertMenuSchema = z.object({
  body: z.object({
    location: z.enum(['header', 'footer', 'sidebar']),
    items: z.array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        url: z.string().min(1),
        icon: z.string().optional(),
        parentKey: z.string().nullable().optional(),
        order: z.number().optional(),
        openInNewTab: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }),
    ),
  }),
});

// ── Page ──────────────────────────────────────────────────────────────
export const createPageSchema = z.object({
  body: z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
    content: z.string().optional(),
    type: z.nativeEnum(PageType).optional(),
    featuredImage: z.string().optional(),
    seo: z
      .object({ title: z.string().optional(), description: z.string().optional(), keywords: z.array(z.string()).optional() })
      .optional(),
    status: z.enum(['draft', 'published']).optional(),
    showInMenu: z.boolean().optional(),
  }),
});

export const updatePageSchema = z.object({
  body: createPageSchema.shape.body.partial(),
  params: z.object({ id: z.string().min(1) }),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

// ── Banner ────────────────────────────────────────────────────────────
export const createBannerSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    device: z.enum(['desktop', 'mobile', 'both']).optional(),
    sortOrder: z.number().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

// ── FAQ ───────────────────────────────────────────────────────────────
export const createFaqSchema = z.object({
  body: z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
    category: z.string().optional(),
    service: z.string().optional(),
    sortOrder: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateFaqSchema = z.object({
  body: createFaqSchema.shape.body.partial(),
  params: z.object({ id: z.string().min(1) }),
});

// ── Announcement ──────────────────────────────────────────────────────
export const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    type: z.nativeEnum(AnnouncementType).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    priority: z.number().optional(),
    isPinned: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateAnnouncementSchema = z.object({
  body: createAnnouncementSchema.shape.body.partial(),
  params: z.object({ id: z.string().min(1) }),
});

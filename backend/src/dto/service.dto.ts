/**
 * Loose shape covering only the fields this DTO reads. Using a plain
 * structural interface (instead of Partial<IService>) keeps this mapper
 * compatible with both hydrated Mongoose documents and .lean() results
 * (whose types differ slightly under strict TypeScript).
 */
interface ServiceLike {
  _id: unknown;
  category?: unknown;
  name?: string;
  slug?: string;
  icon?: string;
  image?: { url?: string };
  description?: string;
  instructions?: string;
  serviceMode?: string;
  serviceFee?: number;
  govtFee?: number;
  cscFee?: number;
  estimatedTimeValue?: number;
  estimatedTimeUnit?: string;
  requiredDocuments?: string[];
  faqs?: { question: string; answer: string }[];
  isFeatured?: boolean;
  seo?: { title?: string; description?: string; keywords?: string[] };
}

/**
 * Public DTO — only fields the customer-facing website needs.
 * Deliberately excludes createdBy/updatedBy/internal audit fields so the
 * response is small (lower bandwidth) and safe to cache at the edge/CDN
 * or in Redis without leaking internal identifiers.
 */
export const toPublicServiceDTO = (service: ServiceLike) => ({
  id: service._id,
  category: service.category,
  name: service.name,
  slug: service.slug,
  icon: service.icon,
  image: service.image?.url,
  description: service.description,
  instructions: service.instructions,
  serviceMode: service.serviceMode,
  fees: {
    service: service.serviceFee,
    govt: service.govtFee,
    csc: service.cscFee,
    total: (service.serviceFee || 0) + (service.govtFee || 0) + (service.cscFee || 0),
  },
  estimatedTime: {
    value: service.estimatedTimeValue,
    unit: service.estimatedTimeUnit,
  },
  requiredDocuments: service.requiredDocuments,
  faqs: service.faqs,
  isFeatured: service.isFeatured,
  seo: service.seo,
});

export type PublicServiceDTO = ReturnType<typeof toPublicServiceDTO>;

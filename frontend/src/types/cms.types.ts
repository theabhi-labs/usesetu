export interface WebsiteSetting {
  websiteName: string;
  cscName: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  darkLogoUrl?: string;
  faviconUrl?: string;
  contact: { address?: string; email?: string; phone?: string; whatsapp?: string; googleMapEmbedUrl?: string };
  theme: { primaryColor: string; secondaryColor: string; accentColor: string; borderRadius: string; fontFamily: string };
  seo: { metaTitle?: string; metaDescription?: string; metaKeywords?: string[]; ogImage?: string };
  socialLinks: Record<string, string>;
  businessHours: { dayOfWeek: number; isOpen: boolean; startTime: string; endTime: string }[];
  holidays: { date: string; label: string }[];
  maintenanceMode: { enabled: boolean; message?: string; estimatedTime?: string };
}

export interface MenuItem {
  key: string;
  label: string;
  url: string;
  icon?: string;
  parentKey?: string | null;
  order: number;
  openInNewTab: boolean;
  isActive: boolean;
}

export interface Banner {
  _id: string;
  title?: string;
  subtitle?: string;
  image: { url: string; fileId: string };
  ctaText?: string;
  ctaLink?: string;
  device: 'desktop' | 'mobile' | 'both';
  sortOrder: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: 'notice' | 'holiday' | 'new_scheme' | 'portal_down';
  startDate: string;
  endDate?: string;
  priority: number;
  isPinned: boolean;
  isActive: boolean;
}

export interface MediaAsset {
  _id: string;
  name: string;
  url: string;
  fileId: string;
  mimeType: string;
  size: number;
  folder?: string;
  uploadedAt: string;
}

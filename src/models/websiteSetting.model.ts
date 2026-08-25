import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Deliberately one document, not eight separate singleton collections
 * (WebsiteSetting/BusinessProfile/ThemeSetting/SeoSetting/ContactSetting/
 * SocialLink/BusinessHour all merged here). Every page load on the public
 * site needs the logo, theme colors, contact info, and SEO defaults
 * together — one query beats eight, and there's no relational need to
 * split them since they always change together via the same admin screen.
 */
export interface IWebsiteSetting extends Omit<Document, '_id'> {
  _id: string;

  websiteName: string;
  cscName: string;
  tagline?: string;
  description?: string;

  logoUrl?: string;
  darkLogoUrl?: string;
  faviconUrl?: string;

  defaultLanguage: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;

  contact: {
    address?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    googleMapEmbedUrl?: string;
  };

  businessProfile: {
    ownerName?: string;
    registrationNumber?: string;
    gstNumber?: string;
    panNumber?: string;
  };

  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    borderRadius: string;
    fontFamily: string;
  };

  seo: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    ogImage?: string;
  };

  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    telegram?: string;
    whatsapp?: string;
  };

  businessHours: { dayOfWeek: number; isOpen: boolean; startTime: string; endTime: string }[];
  holidays: { date: string; label: string }[];

  maintenanceMode: {
    enabled: boolean;
    message?: string;
    estimatedTime?: string;
    allowedIps: string[];
  };

  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const websiteSettingSchema = new Schema<IWebsiteSetting>(
  {
    _id: { type: String },

    websiteName: { type: String, default: 'CSC OS' },
    cscName: { type: String, default: 'Common Service Center' },
    tagline: String,
    description: String,

    logoUrl: String,
    darkLogoUrl: String,
    faviconUrl: String,

    defaultLanguage: { type: String, default: 'en' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timeFormat: { type: String, default: 'hh:mm A' },

    contact: {
      address: String,
      email: String,
      phone: String,
      whatsapp: String,
      googleMapEmbedUrl: String,
    },

    businessProfile: {
      ownerName: String,
      registrationNumber: String,
      gstNumber: String,
      panNumber: String,
    },

    theme: {
      primaryColor: { type: String, default: '#FF6700' },
      secondaryColor: { type: String, default: '#0D0D0D' },
      accentColor: { type: String, default: '#FFB800' },
      borderRadius: { type: String, default: '8px' },
      fontFamily: { type: String, default: 'Inter, sans-serif' },
    },

    seo: {
      metaTitle: String,
      metaDescription: String,
      metaKeywords: [String],
      ogImage: String,
    },

    socialLinks: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
      youtube: String,
      telegram: String,
      whatsapp: String,
    },

    businessHours: {
      type: [
        {
          dayOfWeek: { type: Number, min: 0, max: 6 },
          isOpen: { type: Boolean, default: true },
          startTime: { type: String, default: '10:00' },
          endTime: { type: String, default: '17:00' },
        },
      ],
      default: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, isOpen: d !== 0, startTime: '10:00', endTime: '17:00' })),
    },
    holidays: { type: [{ date: String, label: String }], default: [] },

    maintenanceMode: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: 'We are currently performing maintenance. Please check back soon.' },
      estimatedTime: String,
      allowedIps: { type: [String], default: [] },
    },

    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, _id: false },
);

websiteSettingSchema.plugin(tenantPlugin);

export const WebsiteSetting: Model<IWebsiteSetting> = mongoose.model<IWebsiteSetting>(
  'WebsiteSetting',
  websiteSettingSchema,
);

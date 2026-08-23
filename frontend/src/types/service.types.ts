export type ServiceMode = 'form' | 'queue' | 'appointment' | 'walk_in' | 'hybrid';

export const RequiredDocumentType = {
  AADHAAR: 'aadhaar',
  PAN: 'pan',
  PHOTO: 'photo',
  SIGNATURE: 'signature',
  RATION_CARD: 'ration_card',
  VOTER_ID: 'voter_id',
  PASSPORT: 'passport',
  DRIVING_LICENCE: 'driving_licence',
  OTHER: 'other',
} as const;

export type RequiredDocumentType = typeof RequiredDocumentType[keyof typeof RequiredDocumentType];

export interface Service {
  _id: string;
  category: string;
  name: string;
  slug: string;
  icon?: string;
  image?: { url: string; fileId: string };
  description?: string;
  instructions?: string;
  serviceMode: ServiceMode;
  serviceFee: number;
  govtFee: number;
  cscFee: number;
  estimatedTimeValue: number;
  estimatedTimeUnit: 'minutes' | 'hours' | 'days';
  workingDays: string[];
  requiredDocuments: RequiredDocumentType[];
  faqs: { question: string; answer: string }[];
  paymentSettings: {
    advancePayment: boolean;
    advanceAmount: number;
    allowPartialPayment: boolean;
    allowFullPayment: boolean;
    paymentBeforeProcessing: boolean;
  };
  customStatusWorkflow?: string[];
  seo: { title?: string; description?: string; keywords?: string[] };
  sortOrder: number;
  status: 'active' | 'inactive';
  isFeatured: boolean;
  homepageVisibility: boolean;
}

export interface PublicServiceDTO {
  id: string;
  category: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  description?: string;
  instructions?: string;
  serviceMode: ServiceMode;
  fees: { service: number; govt: number; csc: number; total: number };
  estimatedTime: { value: number; unit: string };
  requiredDocuments: string[];
  faqs: { question: string; answer: string }[];
  isFeatured: boolean;
  seo: { title?: string; description?: string; keywords?: string[] };
}

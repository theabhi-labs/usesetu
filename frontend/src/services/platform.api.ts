import { api } from '../lib/api';

export interface TemplateData {
  _id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  version: number;
}

export interface ApplicationSummary {
  id: string;
  name: string;
  slug: string;
  status: 'provisioning' | 'active' | 'suspended' | 'expired' | 'failed' | 'archived';
  template: {
    name: string;
    slug: string;
    category: string;
  } | null;
  defaultDomain: string;
  primaryDomain?: string;
  subscription: {
    plan: string;
    planSlug: string;
    status: string;
    billingCycle?: 'monthly' | 'yearly';
    endsAt?: string;
    trialEndsAt?: string;
  };
  usage?: {
    storage: { used: number; limit: number | null };
    activeUsers: { used: number; limit: number | null };
  };
  requiresAttention?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ApplicationDetailData extends ApplicationSummary {
  updatedAt: string;
}

export interface CreateAppPayload {
  name: string;
  slug: string;
  templateSlug: string;
}

export interface SlugAvailabilityResponse {
  available: boolean;
  slug: string;
  reason?: string;
}

export interface DomainItem {
  id: string;
  hostname: string;
  type: 'default' | 'subdomain' | 'custom';
  status: 'pending' | 'verifying' | 'verified' | 'active' | 'failed' | 'disabled';
  isPrimary: boolean;
  verificationMethod?: 'cname' | 'txt';
  sslStatus: 'pending' | 'provisioning' | 'active' | 'failed';
  sslProvider?: string;
  verificationError?: string;
  lastVerificationAt?: string;
  verifiedAt?: string;
  activatedAt?: string;
  instructions?: {
    domain: string;
    isApex: boolean;
    primaryMethod: 'cname' | 'txt';
    cname: {
      type: 'CNAME';
      host: string;
      target: string;
      recommended: boolean;
    };
    txt: {
      type: 'TXT';
      host: string;
      value: string;
      token: string;
    };
    guidance: string;
  } | null;
  createdAt: string;
}

export interface DomainConfigResponse {
  defaultDomain: string;
  primaryDomain: string;
  domains: DomainItem[];
  entitlement: {
    enabled: boolean;
    limit: number;
    used: number;
    remaining: number;
  };
  customDomainsEnabled: boolean;
}

export interface PlanItem {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  isDefault: boolean;
  pricing: {
    currency: string;
    monthly: number;
    yearly: number;
  };
  entitlements: {
    activeUsers?: { limit: number };
    storage?: { limit: number; unit?: string };
    customDomain?: { enabled: boolean; limit?: number };
    whatsapp?: { enabled: boolean };
    email?: { enabled: boolean };
    monthlyMessages?: { limit: number };
    monthlyRequests?: { limit: number };
    monthlyAppointments?: { limit: number };
    exportReports?: { enabled: boolean };
    customBranding?: { enabled: boolean };
    maxStorageBytes?: number;
    maxActiveUsers?: number;
    maxRequestsPerMonth?: number;
    maxAppointmentsPerMonth?: number;
    features?: {
      customDomain?: boolean;
      whatsapp?: boolean;
      email?: boolean;
      exportReports?: boolean;
      customBranding?: boolean;
    };
  };
}

export interface ApplicationUsageResponse {
  applicationId: string;
  metrics: {
    activeUsers: { used: number; limit: number | null; remaining: number | null; unit: string };
    storage: { used: number; limit: number | null; remaining: number | null; unit: string };
    monthlyMessages: { used: number; limit: number | null; remaining: number | null; unit: string };
    requests: { used: number; limit: number | null; remaining: number | null; unit: string };
    appointments: { used: number; limit: number | null; remaining: number | null; unit: string };
  };
  features: {
    customDomain: boolean;
    whatsapp: boolean;
    email: boolean;
    exportReports: boolean;
    customBranding: boolean;
  };
}

export interface DashboardMetrics {
  totalApplications: number;
  activeApplications: number;
  attentionApplications: number;
  totalStorageUsed: number;
  totalActiveUsers: number;
  subscriptionBreakdown: Record<string, number>;
}

export interface DashboardData {
  account: {
    id: string;
    name: string;
    status: string;
  };
  metrics: DashboardMetrics;
  applications: ApplicationSummary[];
  recentActivity: Array<{
    id: string;
    applicationId: string;
    action: string;
    oldPlan?: string;
    newPlan?: string;
    reason?: string;
    createdAt: string;
  }>;
}

export interface BillingOverviewData {
  account: {
    id: string;
    name: string;
    status: string;
  };
  subscriptions: Array<{
    applicationId: string;
    applicationName: string;
    slug: string;
    primaryDomain: string;
    status: string;
    subscription: {
      id?: string;
      plan: string;
      planSlug: string;
      status: string;
      billingCycle: 'monthly' | 'yearly';
      startsAt?: string;
      endsAt?: string;
      trialEndsAt?: string;
      cancelledAt?: string;
      pricing: {
        currency: string;
        monthly: number;
        yearly: number;
      };
    };
  }>;
  availablePlans: PlanItem[];
  transactions: any[];
  gatewayNotice: string;
}

export interface ApplicationSettingsData {
  application: {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  branding: {
    cscName: string;
    tagline?: string;
    description?: string;
    logoUrl?: string;
    darkLogoUrl?: string;
    faviconUrl?: string;
    theme: {
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      borderRadius: string;
      fontFamily: string;
    };
    contact?: {
      address?: string;
      email?: string;
      phone?: string;
      whatsapp?: string;
      googleMapEmbedUrl?: string;
    };
    businessProfile?: {
      ownerName?: string;
      registrationNumber?: string;
      gstNumber?: string;
      panNumber?: string;
    };
    socialLinks?: Record<string, string>;
  };
  entitlements: {
    customBranding: boolean;
  };
}

export interface PlatformNotificationItem {
  id: string;
  category: 'provisioning' | 'subscription' | 'quota' | 'domain' | 'status' | 'system';
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: PlatformNotificationItem[];
  unreadCount: number;
}

export interface AccountProfileData {
  account: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    role: string;
    isEmailVerified: boolean;
    createdAt: string;
    lastLoginAt?: string;
    lastLoginIp?: string;
  };
}

export interface AccountSecurityData {
  email: string;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  failedLoginAttempts: number;
  createdAt: string;
  securityRecommendations: string[];
}

export const platformApi = {
  getTemplates: async (): Promise<TemplateData[]> => {
    const res = await api.get<{ success: boolean; data: TemplateData[] }>('/platform/templates');
    return res.data.data;
  },

  getPlans: async (): Promise<PlanItem[]> => {
    const res = await api.get<{ success: boolean; data: PlanItem[] }>('/platform/plans');
    return res.data.data;
  },

  getDashboard: async (): Promise<DashboardData> => {
    const res = await api.get<{ success: boolean; data: DashboardData }>('/platform/dashboard');
    return res.data.data;
  },

  getBillingOverview: async (): Promise<BillingOverviewData> => {
    const res = await api.get<{ success: boolean; data: BillingOverviewData }>('/platform/billing');
    return res.data.data;
  },

  getApplications: async (): Promise<ApplicationSummary[]> => {
    const res = await api.get<{ success: boolean; data: ApplicationSummary[] }>('/platform/applications');
    return res.data.data;
  },

  getApplication: async (id: string): Promise<ApplicationDetailData> => {
    const res = await api.get<{ success: boolean; data: ApplicationDetailData }>(`/platform/applications/${id}`);
    return res.data.data;
  },

  createApplication: async (payload: CreateAppPayload, idempotencyKey?: string) => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await api.post<{ success: boolean; data: any }>('/platform/applications', payload, { headers });
    return res.data.data;
  },

  checkSlugAvailability: async (slug: string): Promise<SlugAvailabilityResponse> => {
    const res = await api.get<{ success: boolean; data: SlugAvailabilityResponse }>(
      `/platform/applications/slug/${encodeURIComponent(slug)}/availability`,
    );
    return res.data.data;
  },

  getApplicationDomain: async (id: string): Promise<DomainConfigResponse> => {
    const res = await api.get<{ success: boolean; data: DomainConfigResponse }>(`/platform/applications/${id}/domains`);
    return res.data.data;
  },

  addCustomDomain: async (appId: string, payload: { hostname: string; verificationMethod?: string }) => {
    const res = await api.post<{ success: boolean; data: any }>(`/platform/applications/${appId}/domains`, payload);
    return res.data.data;
  },

  verifyDomain: async (appId: string, domainId: string) => {
    const res = await api.post<{ success: boolean; data: any }>(
      `/platform/applications/${appId}/domains/${domainId}/verify`,
    );
    return res.data.data;
  },

  setPrimaryDomain: async (appId: string, domainId: string) => {
    const res = await api.post<{ success: boolean; data: any }>(
      `/platform/applications/${appId}/domains/${domainId}/set-primary`,
    );
    return res.data.data;
  },

  deleteDomain: async (appId: string, domainId: string) => {
    const res = await api.delete<{ success: boolean; data: any }>(
      `/platform/applications/${appId}/domains/${domainId}`,
    );
    return res.data.data;
  },

  getDomainStatus: async (appId: string, domainId: string) => {
    const res = await api.get<{ success: boolean; data: any }>(
      `/platform/applications/${appId}/domains/${domainId}/status`,
    );
    return res.data.data;
  },

  getApplicationSubscription: async (id: string) => {
    const res = await api.get<{ success: boolean; data: any }>(`/platform/applications/${id}/subscription`);
    return res.data.data;
  },

  changeApplicationPlan: async (
    id: string,
    payload: { planId?: string; planSlug?: string; billingCycle?: 'monthly' | 'yearly'; reason?: string },
  ) => {
    const res = await api.post<{ success: boolean; data: any }>(
      `/platform/applications/${id}/subscription/change-plan`,
      payload,
    );
    return res.data.data;
  },

  cancelApplicationSubscription: async (id: string, reason?: string) => {
    const res = await api.post<{ success: boolean; data: any }>(`/platform/applications/${id}/subscription/cancel`, {
      reason,
    });
    return res.data.data;
  },

  getApplicationUsage: async (id: string): Promise<ApplicationUsageResponse> => {
    const res = await api.get<{ success: boolean; data: ApplicationUsageResponse }>(
      `/platform/applications/${id}/usage`,
    );
    return res.data.data;
  },

  getApplicationSettings: async (id: string): Promise<ApplicationSettingsData> => {
    const res = await api.get<{ success: boolean; data: ApplicationSettingsData }>(
      `/platform/applications/${id}/settings`,
    );
    return res.data.data;
  },

  updateApplicationSettings: async (id: string, payload: Partial<ApplicationSettingsData['branding']> & { name?: string }) => {
    const res = await api.patch<{ success: boolean; data: any }>(`/platform/applications/${id}/settings`, payload);
    return res.data.data;
  },

  suspendApplication: async (id: string, reason?: string) => {
    const res = await api.post<{ success: boolean; data: any }>(`/platform/applications/${id}/suspend`, { reason });
    return res.data.data;
  },

  resumeApplication: async (id: string, reason?: string) => {
    const res = await api.post<{ success: boolean; data: any }>(`/platform/applications/${id}/resume`, { reason });
    return res.data.data;
  },

  archiveApplication: async (id: string, reason?: string) => {
    const res = await api.post<{ success: boolean; data: any }>(`/platform/applications/${id}/archive`, { reason });
    return res.data.data;
  },

  getAccountProfile: async (): Promise<AccountProfileData> => {
    const res = await api.get<{ success: boolean; data: AccountProfileData }>('/platform/account');
    return res.data.data;
  },

  updateAccountProfile: async (payload: { accountName?: string; name?: string; mobile?: string }) => {
    const res = await api.patch<{ success: boolean; data: AccountProfileData }>('/platform/account', payload);
    return res.data.data;
  },

  getAccountSecurity: async (): Promise<AccountSecurityData> => {
    const res = await api.get<{ success: boolean; data: AccountSecurityData }>('/platform/account/security');
    return res.data.data;
  },

  getNotifications: async (): Promise<NotificationsResponse> => {
    const res = await api.get<{ success: boolean; data: NotificationsResponse }>('/platform/notifications');
    return res.data.data;
  },

  markNotificationRead: async (id: string) => {
    const res = await api.patch<{ success: boolean; data: any }>(`/platform/notifications/${id}/read`);
    return res.data.data;
  },

  markAllNotificationsRead: async () => {
    const res = await api.patch<{ success: boolean; data: any }>('/platform/notifications/read-all');
    return res.data.data;
  },

  getPublicContext: async (slug?: string) => {
    const params = slug ? { slug } : undefined;
    const res = await api.get<{ success: boolean; data: any }>('/public/application/context', { params });
    return res.data.data;
  },

  // ── Stage 7: Payment & Checkout APIs ─────────────────────────────────────
  createBillingCheckout: async (
    applicationId: string,
    payload: { planId: string; billingCycle: 'monthly' | 'yearly' },
  ): Promise<CheckoutResponse> => {
    const res = await api.post<{ success: boolean; data: CheckoutResponse }>(
      `/platform/applications/${applicationId}/billing/checkout`,
      payload,
    );
    return res.data.data;
  },

  verifyBillingPayment: async (
    applicationId: string,
    payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ): Promise<VerifyPaymentResponse> => {
    const res = await api.post<{ success: boolean; data: VerifyPaymentResponse }>(
      `/platform/applications/${applicationId}/billing/verify-payment`,
      payload,
    );
    return res.data.data;
  },

  getApplicationBillingSummary: async (applicationId: string): Promise<ApplicationBillingSummary> => {
    const res = await api.get<{ success: boolean; data: ApplicationBillingSummary }>(
      `/platform/applications/${applicationId}/billing`,
    );
    return res.data.data;
  },

  getBillingHistory: async (
    applicationId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<BillingHistoryResponse> => {
    const res = await api.get<{ success: boolean; data: BillingHistoryResponse }>(
      `/platform/applications/${applicationId}/billing/history`,
      { params: { page, limit } },
    );
    return res.data.data;
  },

  getPaymentDetail: async (applicationId: string, paymentId: string) => {
    const res = await api.get<{ success: boolean; data: any }>(
      `/platform/applications/${applicationId}/billing/payments/${paymentId}`,
    );
    return res.data.data;
  },

  refundBillingPayment: async (
    applicationId: string,
    paymentId: string,
    payload: { amount?: number; reason?: string },
  ) => {
    const res = await api.post<{ success: boolean; data: any }>(
      `/platform/applications/${applicationId}/billing/payments/${paymentId}/refund`,
      payload,
    );
    return res.data.data;
  },

  retryBillingPayment: async (
    applicationId: string,
    payload: { planId: string; billingCycle: 'monthly' | 'yearly' },
  ): Promise<CheckoutResponse> => {
    const res = await api.post<{ success: boolean; data: CheckoutResponse }>(
      `/platform/applications/${applicationId}/billing/retry`,
      payload,
    );
    return res.data.data;
  },
};

export interface CheckoutResponse {
  orderId: string;
  amount: number; // in paise
  currency: string;
  razorpayKeyId: string;
  applicationId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  planName: string;
  transactionId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  transaction: any;
  subscription: any;
}

export interface BillingHistoryItem {
  id: string;
  orderId?: string;
  paymentId?: string;
  amount: number;
  amountMajor: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled';
  method?: string;
  description?: string;
  billingCycle: 'monthly' | 'yearly';
  plan: string;
  planSlug: string;
  paidAt?: string;
  failedAt?: string;
  refundedAt?: string;
  failureReason?: string;
  invoiceNumber?: string;
  createdAt: string;
}

export interface BillingHistoryResponse {
  transactions: BillingHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApplicationBillingSummary {
  applicationId: string;
  applicationName: string;
  currentSubscription: any;
  effectiveEntitlements: any;
  recentTransactions: any[];
  availablePlans: PlanItem[];
}

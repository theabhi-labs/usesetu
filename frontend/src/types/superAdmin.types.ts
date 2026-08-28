export interface SuperAdminOverview {
  platform: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    archivedTenants: number;
  };
  users: {
    total: number;
    active: number;
    customers: number;
    staffAndAdmins: number;
  };
  subscriptions: {
    total: number;
    active: number;
    pastDue: number;
    cancelled: number;
    tiers: Record<string, number>;
  };
  revenue: {
    totalAmount: number;
    monthToDate: number;
    yearToDate: number;
    failedPaymentsCount: number;
    currency: string;
  };
  requests: {
    total: number;
    completed: number;
    pending: number;
    failedOrCancelled: number;
    totalServicesOffered: number;
  };
  system: {
    status: 'operational' | 'degraded' | 'critical';
    database: {
      status: string;
      latencyMs: number;
      poolSize: number;
    };
    uptimeSeconds: number;
    requestsPerMinute: number;
    errorRatePercent: number;
    p50Ms: number;
    p95Ms: number;
    openIncidentsCount: number;
    unresolvedErrorsCount: number;
  };
}

export interface SuperAdminTenantItem {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'provisioning' | 'archived';
  createdAt: string;
  defaultDomain: string;
  template?: {
    name: string;
    slug: string;
    category: string;
  };
  owner: {
    name: string;
    email: string;
    mobile: string;
  };
  subscription: {
    status: string;
    plan: string;
    planSlug: string;
    billingCycle: string;
    endsAt?: string;
  };
  stats: {
    users: number;
    requests: number;
  };
}

export interface SuperAdminTenantsResponse {
  tenants: SuperAdminTenantItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SuperAdminTenantDetails {
  identity: {
    id: string;
    name: string;
    slug: string;
    status: string;
    tenantId: string;
    createdAt: string;
    template: any;
    owner: {
      name: string;
      email: string;
      mobile: string;
    };
  };
  domain: {
    defaultDomain: string;
  };
  subscription: any;
  metrics: {
    totalUsers: number;
    totalServices: number;
    totalRequests: number;
  };
  recentUsers: any[];
  recentRequests: any[];
}

export interface SuperAdminRequestsWatchdog {
  summary: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    completed: number;
    pending: number;
    failedOrCancelled: number;
  };
  statusDistribution: Array<{
    status: string;
    count: number;
  }>;
  trends: Array<{
    _id: string;
    total: number;
    completed: number;
    failed: number;
  }>;
  rankings: Array<{
    tenantId: string;
    name: string;
    slug: string;
    totalRequests: number;
    completed: number;
    pending: number;
    failed: number;
    failureRate: string;
  }>;
}

export interface SuperAdminRevenueResponse {
  summary: {
    grossRevenue: number;
    monthToDate: number;
    yearToDate: number;
    mrr: number;
    arr: number;
    successfulPayments: number;
    failedPayments: number;
    refunds: number;
    currency: string;
  };
  monthlyTrends: Array<{
    _id: string;
    revenue: number;
    count: number;
  }>;
  planBreakdown: Array<{
    _id: string;
    totalRevenue: number;
    transactionsCount: number;
  }>;
  recentTransactions: Array<{
    id: string;
    amountMajor: number;
    currency: string;
    status: string;
    plan: string;
    billingCycle: string;
    paymentId: string;
    invoiceNumber?: string;
    createdAt: string;
  }>;
}

export interface SuperAdminPlanItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  status: 'active' | 'inactive' | 'archived';
  isDefault: boolean;
  pricing: {
    currency: string;
    monthly: number;
    yearly: number;
  };
  entitlements: {
    activeUsers: { limit: number };
    storage: { limit: number; unit: string };
    customDomain: { enabled: boolean; limit?: number };
    whatsapp: { enabled: boolean };
    email: { enabled: boolean };
    monthlyMessages: { limit: number };
    monthlyRequests: { limit: number };
    monthlyAppointments: { limit: number };
    exportReports: { enabled: boolean };
    customBranding: { enabled: boolean };
  };
  version: number;
  createdAt: string;
  updatedAt: string;
}

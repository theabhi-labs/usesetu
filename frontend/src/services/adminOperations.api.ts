import { api } from '../lib/api';

export interface OperationsOverview {
  system: {
    status: string;
    database: {
      status: string;
      latencyMs: number;
      readyStateText: string;
      host?: string;
      databaseName?: string;
      collections?: number;
    };
    uptimeSeconds: number;
    timestamp: string;
  };
  performance: {
    requestsPerMinute: number;
    totalRequests: number;
    errorRatePercent: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  incidents: {
    openCount: number;
  };
  errors: {
    unresolvedCriticalCount: number;
  };
  billing: {
    totalTransactions: number;
    capturedCount: number;
    failedCount: number;
    refundedCount: number;
    pendingCount: number;
    paymentSuccessRate: number;
    totalVolumeINR: number;
  };
  webhooks: {
    totalEvents: number;
    processedCount: number;
    failedCount: number;
    ignoredCount: number;
    duplicateCount: number;
    webhookSuccessRate: number;
  };
  subscriptions: {
    totalActive: number;
    totalTrialing: number;
    totalPastDue: number;
    totalExpired: number;
    totalCancelled: number;
    inGracePeriodCount: number;
  };
  domains: {
    totalDomains: number;
    activeDomains: number;
    pendingVerification: number;
    failedVerification: number;
    sslPending: number;
    sslActive: number;
    sslFailed: number;
    disabledDomains: number;
  };
  applications: {
    totalApplications: number;
    active: number;
    provisioning: number;
    suspended: number;
    archived: number;
    totalAccounts: number;
  };
}

export const adminOperationsApi = {
  getOverview: async (): Promise<OperationsOverview> => {
    const res = await api.get('/admin/operations/overview');
    return res.data.data;
  },

  getPerformanceMetrics: async () => {
    const res = await api.get('/admin/operations/metrics');
    return res.data.data;
  },

  getIncidents: async (params?: { page?: number; limit?: number; severity?: string; status?: string; search?: string }) => {
    const res = await api.get('/admin/operations/incidents', { params });
    return res.data.data;
  },

  acknowledgeIncident: async (id: string) => {
    const res = await api.patch(`/admin/operations/incidents/${id}/acknowledge`);
    return res.data.data;
  },

  resolveIncident: async (id: string) => {
    const res = await api.patch(`/admin/operations/incidents/${id}/resolve`);
    return res.data.data;
  },

  ignoreIncident: async (id: string) => {
    const res = await api.patch(`/admin/operations/incidents/${id}/ignore`);
    return res.data.data;
  },

  getTrackedErrors: async (params?: { page?: number; limit?: number; severity?: string; status?: string; search?: string }) => {
    const res = await api.get('/admin/operations/errors', { params });
    return res.data.data;
  },

  resolveTrackedError: async (id: string) => {
    const res = await api.patch(`/admin/operations/errors/${id}/resolve`);
    return res.data.data;
  },

  getJobHistory: async (params?: { page?: number; limit?: number; jobName?: string; status?: string }) => {
    const res = await api.get('/admin/operations/jobs', { params });
    return res.data.data;
  },

  getBillingHealth: async () => {
    const res = await api.get('/admin/operations/billing-health');
    return res.data.data;
  },

  getDomainHealth: async () => {
    const res = await api.get('/admin/operations/domain-health');
    return res.data.data;
  },

  getSecurityEvents: async (params?: { page?: number; limit?: number; eventType?: string; severity?: string }) => {
    const res = await api.get('/admin/operations/security-events', { params });
    return res.data.data;
  },
};

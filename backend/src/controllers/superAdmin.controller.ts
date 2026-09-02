import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { Application, ApplicationStatus } from '../models/application.model';
import { User } from '../models/user.model';
import { Subscription, SubscriptionStatus } from '../models/subscription.model';
import { Plan, PlanStatus } from '../models/plan.model';
import { PaymentTransaction, PaymentTransactionStatus } from '../models/paymentTransaction.model';
import { Request as ServiceRequest, RequestStatus } from '../models/request.model';
import { Service } from '../models/service.model';
import { SystemIncident } from '../models/systemIncident.model';
import { SystemError } from '../models/systemError.model';
import { DatabaseHealthService } from '../services/observability/databaseHealth.service';
import { MetricsService } from '../services/observability/metrics.service';
import { Role } from '../types/auth.types';

// ============================================================================
// 1. GET /api/v1/platform/super-admin/overview
// Global KPI Metrics across all tenants, users, subscriptions, revenue & system
// ============================================================================
export const getSuperAdminOverview = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalApps,
    activeApps,
    suspendedApps,
    archivedApps,
    totalUsers,
    activeUsers,
    customerUsers,
    adminUsers,
    totalSubscriptions,
    activeSubscriptions,
    pastDueSubscriptions,
    cancelledSubscriptions,
    plansList,
    totalRevenueAgg,
    monthRevenueAgg,
    yearRevenueAgg,
    failedPaymentsCount,
    totalRequests,
    completedRequests,
    pendingRequests,
    failedRequests,
    totalServices,
    dbHealth,
    perfSummary,
    openIncidents,
    criticalErrors,
  ] = await Promise.all([
    // Applications / Tenants
    Application.countDocuments({}).setOptions({ bypassTenantQuery: true }),
    Application.countDocuments({ status: ApplicationStatus.ACTIVE }).setOptions({ bypassTenantQuery: true }),
    Application.countDocuments({ status: ApplicationStatus.SUSPENDED }).setOptions({ bypassTenantQuery: true }),
    Application.countDocuments({ status: ApplicationStatus.ARCHIVED }).setOptions({ bypassTenantQuery: true }),

    // Users
    User.countDocuments({}).setOptions({ bypassTenantQuery: true }),
    User.countDocuments({ isActive: true }).setOptions({ bypassTenantQuery: true }),
    User.countDocuments({ role: Role.CUSTOMER }).setOptions({ bypassTenantQuery: true }),
    User.countDocuments({ role: { $in: [Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF] } }).setOptions({ bypassTenantQuery: true }),

    // Subscriptions
    Subscription.countDocuments({}).setOptions({ bypassTenantQuery: true }),
    Subscription.countDocuments({ status: SubscriptionStatus.ACTIVE }).setOptions({ bypassTenantQuery: true }),
    Subscription.countDocuments({ status: SubscriptionStatus.PAST_DUE }).setOptions({ bypassTenantQuery: true }),
    Subscription.countDocuments({ status: SubscriptionStatus.CANCELLED }).setOptions({ bypassTenantQuery: true }),
    Plan.find({}).setOptions({ bypassTenantQuery: true }).lean(),

    // Revenue Aggregations (amount in paise, so amount / 100)
    PaymentTransaction.aggregate([
      { $match: { status: PaymentTransactionStatus.CAPTURED } },
      { $group: { _id: null, total: { $sum: { $divide: ['$amount', 100] } } } },
    ]),
    PaymentTransaction.aggregate([
      {
        $match: {
          status: PaymentTransactionStatus.CAPTURED,
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      },
      { $group: { _id: null, total: { $sum: { $divide: ['$amount', 100] } } } },
    ]),
    PaymentTransaction.aggregate([
      {
        $match: {
          status: PaymentTransactionStatus.CAPTURED,
          createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) },
        },
      },
      { $group: { _id: null, total: { $sum: { $divide: ['$amount', 100] } } } },
    ]),
    PaymentTransaction.countDocuments({ status: PaymentTransactionStatus.FAILED }).setOptions({ bypassTenantQuery: true }),

    // Requests
    ServiceRequest.countDocuments({}).setOptions({ bypassTenantQuery: true }),
    ServiceRequest.countDocuments({ status: RequestStatus.COMPLETED }).setOptions({ bypassTenantQuery: true }),
    ServiceRequest.countDocuments({ status: { $in: [RequestStatus.SUBMITTED, RequestStatus.IN_PROGRESS] } }).setOptions({ bypassTenantQuery: true }),
    ServiceRequest.countDocuments({ status: { $in: [RequestStatus.REJECTED, RequestStatus.CANCELLED] } }).setOptions({ bypassTenantQuery: true }),

    // Services
    Service.countDocuments({}).setOptions({ bypassTenantQuery: true }),

    // System Telemetry
    DatabaseHealthService.checkHealth(),
    MetricsService.getPerformanceSummary(),
    SystemIncident.countDocuments({ status: { $in: ['OPEN', 'ACKNOWLEDGED'] } }),
    SystemError.countDocuments({ status: 'UNRESOLVED' }),
  ]);

  // Subscription Breakdown by plan tier
  const subBreakdown = await Subscription.aggregate([
    {
      $group: {
        _id: '$planId',
        count: { $sum: 1 },
      },
    },
  ]);

  const planIdToName = new Map<string, string>(plansList.map((p: any) => [p._id.toString(), p.name]));
  const subscriptionTiers: Record<string, number> = {};
  for (const s of subBreakdown) {
    const key = s._id ? s._id.toString() : '';
    const pName = planIdToName.get(key) || 'Free Tier';
    subscriptionTiers[pName] = (subscriptionTiers[pName] || 0) + s.count;
  }

  const overview = {
    platform: {
      totalTenants: totalApps,
      activeTenants: activeApps,
      suspendedTenants: suspendedApps,
      archivedTenants: archivedApps,
    },
    users: {
      total: totalUsers,
      active: activeUsers,
      customers: customerUsers,
      staffAndAdmins: adminUsers,
    },
    subscriptions: {
      total: totalSubscriptions,
      active: activeSubscriptions,
      pastDue: pastDueSubscriptions,
      cancelled: cancelledSubscriptions,
      tiers: subscriptionTiers,
    },
    revenue: {
      totalAmount: totalRevenueAgg[0]?.total || 0,
      monthToDate: monthRevenueAgg[0]?.total || 0,
      yearToDate: yearRevenueAgg[0]?.total || 0,
      failedPaymentsCount,
      currency: 'INR',
    },
    requests: {
      total: totalRequests,
      completed: completedRequests,
      pending: pendingRequests,
      failedOrCancelled: failedRequests,
      totalServicesOffered: totalServices,
    },
    system: {
      status: dbHealth.status === 'critical' ? 'critical' : openIncidents > 0 ? 'degraded' : 'operational',
      database: dbHealth,
      uptimeSeconds: perfSummary.uptimeSeconds,
      requestsPerMinute: perfSummary.requestsPerMinute,
      errorRatePercent: perfSummary.errorRatePercent,
      p50Ms: perfSummary.p50Ms,
      p95Ms: perfSummary.p95Ms,
      openIncidentsCount: openIncidents,
      unresolvedErrorsCount: criticalErrors,
    },
  };

  res.status(200).json(new ApiResponse(200, overview, 'Super Admin overview fetched successfully'));
});

// ============================================================================
// 2. GET /api/v1/platform/super-admin/tenants
// Global Searchable & Filterable directory of all Applications/Tenants
// ============================================================================
export const getSuperAdminTenants = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 12;
  const search = (req.query.search as string) || '';
  const status = (req.query.status as string) || '';

  const matchFilter: any = {};
  if (status && status !== 'all') {
    matchFilter.status = status;
  }
  if (search) {
    matchFilter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Application.countDocuments(matchFilter).setOptions({ bypassTenantQuery: true });

  const applications = await Application.find(matchFilter)
    .setOptions({ bypassTenantQuery: true })
    .populate({ path: 'templateId', select: 'name slug category' })
    .populate({ path: 'accountId', select: 'name ownerId' })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // Populate owner user info and subscription info for each application
  const enrichedApps = await Promise.all(
    applications.map(async (app: any) => {
      const [sub, userCount, reqCount, ownerUser] = await Promise.all([
        Subscription.findOne({ applicationId: app._id })
          .setOptions({ bypassTenantQuery: true })
          .populate('planId', 'name slug')
          .lean(),
        User.countDocuments({ tenantId: app.tenantId }).setOptions({ bypassTenantQuery: true }),
        ServiceRequest.countDocuments({ tenantId: app.tenantId }).setOptions({ bypassTenantQuery: true }),
        app.accountId?.ownerId
          ? User.findById(app.accountId.ownerId).setOptions({ bypassTenantQuery: true }).select('name email mobile').lean()
          : null,
      ]);

      return {
        id: app._id,
        name: app.name,
        slug: app.slug,
        status: app.status,
        createdAt: app.createdAt,
        defaultDomain: `${app.slug}.usesetu.com`,
        template: app.templateId,
        owner: ownerUser || { name: 'Platform Owner', email: 'owner@usesetu.local' },
        subscription: sub
          ? {
              status: sub.status,
              plan: (sub.planId as any)?.name || 'Free',
              planSlug: (sub.planId as any)?.slug || 'free',
              billingCycle: sub.billingCycle,
              endsAt: sub.endsAt || sub.createdAt,
            }
          : { status: 'active', plan: 'Free', planSlug: 'free', billingCycle: 'monthly' },
        stats: {
          users: userCount,
          requests: reqCount,
        },
      };
    }),
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        tenants: enrichedApps,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
      'Tenants directory fetched successfully',
    ),
  );
});

// ============================================================================
// 3. GET /api/v1/platform/super-admin/tenants/:id
// Deep inspection of a single tenant application
// ============================================================================
export const getSuperAdminTenantDetails = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const app = await Application.findById(id)
    .setOptions({ bypassTenantQuery: true })
    .populate('templateId')
    .populate('accountId')
    .lean();

  if (!app) {
    throw ApiError.notFound('Application not found');
  }

  const [sub, usersList, recentRequests, servicesCount, ownerUser] = await Promise.all([
    Subscription.findOne({ applicationId: app._id })
      .setOptions({ bypassTenantQuery: true })
      .populate('planId')
      .lean(),
    User.find({ tenantId: app.tenantId })
      .setOptions({ bypassTenantQuery: true })
      .select('name email mobile role createdAt isActive')
      .limit(10)
      .lean(),
    ServiceRequest.find({ tenantId: app.tenantId })
      .setOptions({ bypassTenantQuery: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('serviceId', 'name code')
      .lean(),
    Service.countDocuments({ tenantId: app.tenantId }).setOptions({ bypassTenantQuery: true }),
    (app.accountId as any)?.ownerId
      ? User.findById((app.accountId as any).ownerId).setOptions({ bypassTenantQuery: true }).select('name email mobile').lean()
      : null,
  ]);

  const details = {
    identity: {
      id: app._id,
      name: app.name,
      slug: app.slug,
      status: app.status,
      tenantId: app.tenantId,
      createdAt: app.createdAt,
      template: app.templateId,
      owner: ownerUser || { name: 'Owner', email: 'owner@usesetu.com' },
    },
    domain: {
      defaultDomain: `${app.slug}.usesetu.com`,
    },
    subscription: sub || null,
    metrics: {
      totalUsers: usersList.length,
      totalServices: servicesCount,
      totalRequests: recentRequests.length,
    },
    recentUsers: usersList,
    recentRequests: recentRequests,
  };

  res.status(200).json(new ApiResponse(200, details, 'Tenant details fetched successfully'));
});

// ============================================================================
// 4. GET /api/v1/platform/super-admin/requests
// Global Request Watchdog (across all tenants, time trends, tenant ranking)
// ============================================================================
export const getSuperAdminRequests = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalRequests,
    todayRequests,
    thisWeekRequests,
    thisMonthRequests,
    completedRequests,
    pendingRequests,
    rejectedRequests,
    statusBreakdown,
  ] = await Promise.all([
    ServiceRequest.countDocuments({}).setOptions({ bypassTenantQuery: true }),
    ServiceRequest.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }).setOptions({ bypassTenantQuery: true }),
    ServiceRequest.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }).setOptions({ bypassTenantQuery: true }),
    ServiceRequest.countDocuments({
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    }).setOptions({ bypassTenantQuery: true }),
    ServiceRequest.countDocuments({ status: RequestStatus.COMPLETED }).setOptions({ bypassTenantQuery: true }),
    ServiceRequest.countDocuments({
      status: { $in: [RequestStatus.SUBMITTED, RequestStatus.IN_PROGRESS] },
    }).setOptions({ bypassTenantQuery: true }),
    ServiceRequest.countDocuments({
      status: { $in: [RequestStatus.REJECTED, RequestStatus.CANCELLED] },
    }).setOptions({ bypassTenantQuery: true }),
    ServiceRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Request trends by last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dailyTrends = await ServiceRequest.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', RequestStatus.COMPLETED] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $in: ['$status', [RequestStatus.REJECTED, RequestStatus.CANCELLED]] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Top Tenants by Request Volume
  const tenantRankingsRaw = await ServiceRequest.aggregate([
    {
      $group: {
        _id: '$tenantId',
        totalRequests: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', RequestStatus.COMPLETED] }, 1, 0] } },
        pending: {
          $sum: {
            $cond: [
              { $in: ['$status', [RequestStatus.SUBMITTED, RequestStatus.IN_PROGRESS]] },
              1,
              0,
            ],
          },
        },
        failed: { $sum: { $cond: [{ $in: ['$status', [RequestStatus.REJECTED, RequestStatus.CANCELLED]] }, 1, 0] } },
      },
    },
    { $sort: { totalRequests: -1 } },
    { $limit: 10 },
  ]);

  const tenantIds = tenantRankingsRaw.map((t: any) => t._id).filter(Boolean);
  const tenantsFound = await Application.find({ tenantId: { $in: tenantIds } })
    .setOptions({ bypassTenantQuery: true })
    .select('name slug tenantId')
    .lean();

  const tenantMap = new Map(tenantsFound.map((app: any) => [app.tenantId.toString(), app]));

  const tenantRankings = tenantRankingsRaw.map((tr: any) => {
    const app = tenantMap.get(tr._id?.toString());
    const total = tr.totalRequests || 0;
    const failed = tr.failed || 0;
    const failureRate = total > 0 ? ((failed / total) * 100).toFixed(1) : '0';

    return {
      tenantId: tr._id,
      name: app?.name || 'Master Center',
      slug: app?.slug || 'master',
      totalRequests: total,
      completed: tr.completed,
      pending: tr.pending,
      failed,
      failureRate: `${failureRate}%`,
    };
  });

  const responseData = {
    summary: {
      total: totalRequests,
      today: todayRequests,
      thisWeek: thisWeekRequests,
      thisMonth: thisMonthRequests,
      completed: completedRequests,
      pending: pendingRequests,
      failedOrCancelled: rejectedRequests,
    },
    statusDistribution: statusBreakdown.map((s: any) => ({ status: s._id, count: s.count })),
    trends: dailyTrends,
    rankings: tenantRankings,
  };

  res.status(200).json(new ApiResponse(200, responseData, 'Request watchdog telemetry fetched successfully'));
});

// ============================================================================
// 5. GET /api/v1/platform/super-admin/revenue
// Global Revenue & Financial Reporting (MRR, ARR, Ledger)
// ============================================================================
export const getSuperAdminRevenue = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalRevenueAgg,
    monthRevenueAgg,
    yearRevenueAgg,
    successfulPaymentsCount,
    failedPaymentsCount,
    refundedCount,
    recentTransactions,
  ] = await Promise.all([
    PaymentTransaction.aggregate([
      { $match: { status: PaymentTransactionStatus.CAPTURED } },
      { $group: { _id: null, total: { $sum: { $divide: ['$amount', 100] } } } },
    ]),
    PaymentTransaction.aggregate([
      {
        $match: {
          status: PaymentTransactionStatus.CAPTURED,
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      },
      { $group: { _id: null, total: { $sum: { $divide: ['$amount', 100] } } } },
    ]),
    PaymentTransaction.aggregate([
      {
        $match: {
          status: PaymentTransactionStatus.CAPTURED,
          createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) },
        },
      },
      { $group: { _id: null, total: { $sum: { $divide: ['$amount', 100] } } } },
    ]),
    PaymentTransaction.countDocuments({ status: PaymentTransactionStatus.CAPTURED }).setOptions({ bypassTenantQuery: true }),
    PaymentTransaction.countDocuments({ status: PaymentTransactionStatus.FAILED }).setOptions({ bypassTenantQuery: true }),
    PaymentTransaction.countDocuments({
      status: { $in: [PaymentTransactionStatus.REFUNDED, PaymentTransactionStatus.PARTIALLY_REFUNDED] },
    }).setOptions({ bypassTenantQuery: true }),
    PaymentTransaction.find({})
      .setOptions({ bypassTenantQuery: true })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('planId', 'name slug')
      .lean(),
  ]);

  // Monthly Revenue Trend (Last 6 Months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyTrends = await PaymentTransaction.aggregate([
    {
      $match: {
        status: PaymentTransactionStatus.CAPTURED,
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        revenue: { $sum: { $divide: ['$amount', 100] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Revenue Breakdown by Plan Tier
  const planBreakdown = await PaymentTransaction.aggregate([
    { $match: { status: PaymentTransactionStatus.CAPTURED } },
    {
      $group: {
        _id: '$planId',
        totalRevenue: { $sum: { $divide: ['$amount', 100] } },
        transactionsCount: { $sum: 1 },
      },
    },
  ]);

  const grossRevenue = totalRevenueAgg[0]?.total || 0;
  const monthRevenue = monthRevenueAgg[0]?.total || 0;
  const yearRevenue = yearRevenueAgg[0]?.total || 0;

  const revenueData = {
    summary: {
      grossRevenue,
      monthToDate: monthRevenue,
      yearToDate: yearRevenue,
      mrr: monthRevenue, // Monthly Recurring estimate
      arr: monthRevenue * 12, // Annualized estimate
      successfulPayments: successfulPaymentsCount,
      failedPayments: failedPaymentsCount,
      refunds: refundedCount,
      currency: 'INR',
    },
    monthlyTrends,
    planBreakdown,
    recentTransactions: recentTransactions.map((t: any) => ({
      id: t._id,
      amountMajor: (t.amount || 0) / 100,
      currency: t.currency,
      status: t.status,
      plan: (t.planId as any)?.name || 'Pro Plan',
      billingCycle: t.billingCycle,
      paymentId: t.providerPaymentId || t.providerOrderId || t._id,
      invoiceNumber: t.providerInvoiceId,
      createdAt: t.createdAt,
    })),
  };

  res.status(200).json(new ApiResponse(200, revenueData, 'Revenue analytics fetched successfully'));
});

// ============================================================================
// 6. GET / POST / PATCH /api/v1/platform/super-admin/plans
// Master Subscription Plans & Pricing Configuration
// ============================================================================
export const getSuperAdminPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await Plan.find({}).setOptions({ bypassTenantQuery: true }).sort({ 'pricing.monthly': 1 }).lean();
  res.status(200).json(new ApiResponse(200, plans, 'Plans fetched successfully'));
});

export const createSuperAdminPlan = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug, description, pricing, entitlements, isDefault } = req.body;

  if (!name || !slug || !pricing) {
    throw ApiError.badRequest('Name, slug, and pricing are required');
  }

  const existing = await Plan.findOne({ slug }).setOptions({ bypassTenantQuery: true });
  if (existing) {
    throw ApiError.conflict(`Plan with slug ${slug} already exists`);
  }

  const newPlan = await Plan.create({
    name,
    slug,
    description: description || '',
    pricing: {
      currency: pricing.currency || 'INR',
      monthly: Number(pricing.monthly) || 0,
      yearly: Number(pricing.yearly) || 0,
    },
    entitlements: {
      activeUsers: { limit: Number(entitlements?.activeUsers?.limit) || 5 },
      storage: { limit: Number(entitlements?.storage?.limit) || 524288000, unit: 'bytes' },
      customDomain: { enabled: Boolean(entitlements?.customDomain?.enabled), limit: Number(entitlements?.customDomain?.limit) || 0 },
      whatsapp: { enabled: Boolean(entitlements?.whatsapp?.enabled) },
      email: { enabled: Boolean(entitlements?.email?.enabled ?? true) },
      monthlyMessages: { limit: Number(entitlements?.monthlyMessages?.limit) || 500 },
      monthlyRequests: { limit: Number(entitlements?.monthlyRequests?.limit) || 1000 },
      monthlyAppointments: { limit: Number(entitlements?.monthlyAppointments?.limit) || 100 },
      exportReports: { enabled: Boolean(entitlements?.exportReports?.enabled) },
      customBranding: { enabled: Boolean(entitlements?.customBranding?.enabled) },
    },
    isDefault: Boolean(isDefault),
    status: PlanStatus.ACTIVE,
    version: 1,
  });

  res.status(201).json(new ApiResponse(201, newPlan, 'Plan created successfully'));
});

export const updateSuperAdminPlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const plan = await Plan.findById(id).setOptions({ bypassTenantQuery: true });
  if (!plan) {
    throw ApiError.notFound('Plan not found');
  }

  if (updates.name) plan.name = updates.name;
  if (updates.description !== undefined) plan.description = updates.description;
  if (updates.status) plan.status = updates.status;
  if (updates.isDefault !== undefined) plan.isDefault = updates.isDefault;

  if (updates.pricing) {
    plan.pricing = {
      currency: updates.pricing.currency || plan.pricing.currency,
      monthly: updates.pricing.monthly !== undefined ? Number(updates.pricing.monthly) : plan.pricing.monthly,
      yearly: updates.pricing.yearly !== undefined ? Number(updates.pricing.yearly) : plan.pricing.yearly,
    };
  }

  if (updates.entitlements) {
    plan.entitlements = {
      ...plan.entitlements,
      ...updates.entitlements,
    };
  }

  plan.version = (plan.version || 1) + 1;
  await plan.save();

  res.status(200).json(new ApiResponse(200, plan, 'Plan updated successfully'));
});

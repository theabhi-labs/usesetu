import { Plan, PlanStatus } from '../models/plan.model';
import { Application } from '../models/application.model';
import { Subscription, SubscriptionStatus, BillingCycle } from '../models/subscription.model';
import { EntitlementService } from '../services/entitlement.service';

export const standardPlans = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Essential toolkit for getting started with a single digital service center',
    status: PlanStatus.ACTIVE,
    isDefault: true,
    pricing: {
      currency: 'INR',
      monthly: 0,
      yearly: 0,
    },
    entitlements: {
      activeUsers: { limit: 5 },
      storage: { limit: 524288000, unit: 'bytes' }, // 500 MB
      customDomain: { enabled: false, limit: 0 },
      whatsapp: { enabled: false },
      email: { enabled: true },
      monthlyMessages: { limit: 100 },
      monthlyRequests: { limit: 200 },
      monthlyAppointments: { limit: 50 },
      exportReports: { enabled: false },
      customBranding: { enabled: false },
    },
    version: 1,
  },
  {
    name: 'Starter',
    slug: 'starter',
    description: 'Growing digital service centers needing WhatsApp messaging and team collaboration',
    status: PlanStatus.ACTIVE,
    isDefault: false,
    pricing: {
      currency: 'INR',
      monthly: 499,
      yearly: 4990,
    },
    entitlements: {
      activeUsers: { limit: 15 },
      storage: { limit: 2147483648, unit: 'bytes' }, // 2 GB
      customDomain: { enabled: false, limit: 0 },
      whatsapp: { enabled: true },
      email: { enabled: true },
      monthlyMessages: { limit: 1000 },
      monthlyRequests: { limit: 1000 },
      monthlyAppointments: { limit: 300 },
      exportReports: { enabled: true },
      customBranding: { enabled: false },
    },
    version: 1,
  },
  {
    name: 'Professional',
    slug: 'professional',
    description: 'High-volume CSC operators wanting custom branding, custom domains, and larger teams',
    status: PlanStatus.ACTIVE,
    isDefault: false,
    pricing: {
      currency: 'INR',
      monthly: 999,
      yearly: 9990,
    },
    entitlements: {
      activeUsers: { limit: 50 },
      storage: { limit: 10737418240, unit: 'bytes' }, // 10 GB
      customDomain: { enabled: true, limit: 1 },
      whatsapp: { enabled: true },
      email: { enabled: true },
      monthlyMessages: { limit: 5000 },
      monthlyRequests: { limit: 5000 },
      monthlyAppointments: { limit: 1500 },
      exportReports: { enabled: true },
      customBranding: { enabled: true },
    },
    version: 1,
  },
  {
    name: 'Business',
    slug: 'business',
    description: 'Multi-branch enterprise operations requiring maximum quotas and premium capabilities',
    status: PlanStatus.ACTIVE,
    isDefault: false,
    pricing: {
      currency: 'INR',
      monthly: 1999,
      yearly: 19990,
    },
    entitlements: {
      activeUsers: { limit: 200 },
      storage: { limit: 53687091200, unit: 'bytes' }, // 50 GB
      customDomain: { enabled: true, limit: 5 },
      whatsapp: { enabled: true },
      email: { enabled: true },
      monthlyMessages: { limit: 25000 },
      monthlyRequests: { limit: 25000 },
      monthlyAppointments: { limit: 10000 },
      exportReports: { enabled: true },
      customBranding: { enabled: true },
    },
    version: 1,
  },
];

export const seedPlans = async (): Promise<void> => {
  for (const planData of standardPlans) {
    const existing = await Plan.findOne({ slug: planData.slug });
    if (!existing) {
      await Plan.create(planData);
    } else {
      existing.entitlements = planData.entitlements as any;
      await existing.save();
    }
  }
};

export const seedPlansAndSubscriptions = async (): Promise<void> => {
  await seedPlans();

  const freePlan = await Plan.findOne({ slug: 'free' });
  if (!freePlan) return;

  // Backfill existing Applications with an active Free subscription
  const applications = await Application.find({}).setOptions({ bypassTenantQuery: true });

  for (const app of applications) {
    const existingSub = await Subscription.findOne({
      applicationId: app._id,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
    });

    if (!existingSub) {
      await Subscription.create({
        applicationId: app._id,
        planId: freePlan._id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        startsAt: new Date(),
        planSnapshot: {
          planId: freePlan._id as any,
          slug: freePlan.slug,
          name: freePlan.name,
          entitlements: freePlan.entitlements,
          version: freePlan.version,
        },
      });
      if (app.tenantId) {
        await EntitlementService.syncActiveUsersUsage(app._id, app.tenantId);
        await EntitlementService.syncStorageUsage(app._id, app.tenantId);
      }
    }
  }
};

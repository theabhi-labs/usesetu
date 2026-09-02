import { ApplicationTemplate, TemplateStatus } from '../models/applicationTemplate.model';
import { seedPlans } from './planAndSubscription.seeder';
import { logger } from '../config/logger';

export const defaultTemplates = [
  {
    name: 'Digital Service Center (Jan Seva Kendra)',
    slug: 'digital-service-center',
    category: 'digital_service_center',
    description: 'Complete operating system for CSCs, Jan Seva Kendras, Cyber Cafes, and Citizen Service Points with online requests, certificate delivery, and wallet payments.',
    status: TemplateStatus.ACTIVE,
    version: 1,
    configuration: {
      theme: 'orange',
      features: ['services', 'requests', 'documents', 'billing', 'appointments', 'locker', 'cards'],
    },
  },
  {
    name: 'E-Governance & Utility Hub',
    slug: 'egov-utility-hub',
    category: 'governance_utility',
    description: 'Direct citizen services blueprint with bill payments, identity document assistance, welfare scheme applications, and status tracking.',
    status: TemplateStatus.ACTIVE,
    version: 1,
    configuration: {
      theme: 'blue',
      features: ['services', 'requests', 'documents', 'payments', 'notifications'],
    },
  },
  {
    name: 'Multi-Branch Kendra Enterprise',
    slug: 'multi-branch-kendra',
    category: 'enterprise_fleet',
    description: 'Franchise-grade platform for managing multiple operator branches, pooled quotas, operator commissions, and consolidated reports.',
    status: TemplateStatus.ACTIVE,
    version: 1,
    configuration: {
      theme: 'emerald',
      features: ['services', 'requests', 'documents', 'billing', 'analytics', 'staff_seats', 'domains'],
    },
  },
];

export const seedDefaultTemplates = async (): Promise<void> => {
  try {
    for (const tpl of defaultTemplates) {
      const existing = await ApplicationTemplate.findOne({ slug: tpl.slug });
      if (!existing) {
        await ApplicationTemplate.create(tpl);
        logger.info(`Seeded application template: ${tpl.name} (${tpl.slug})`);
      } else {
        existing.name = tpl.name;
        existing.description = tpl.description;
        existing.status = TemplateStatus.ACTIVE;
        existing.configuration = tpl.configuration;
        await existing.save();
      }
    }
  } catch (err: any) {
    logger.error(`Failed to seed default templates: ${err.message}`);
  }
};

export const ensureEssentialPlatformData = async (): Promise<void> => {
  try {
    await seedDefaultTemplates();
    await seedPlans();
    logger.info('Essential platform templates and subscription plans verified/seeded successfully.');
  } catch (err: any) {
    logger.error(`Error ensuring essential platform data: ${err.message}`);
  }
};

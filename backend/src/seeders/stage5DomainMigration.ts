import mongoose from 'mongoose';
import { env } from '../config/env';
import { Application } from '../models/application.model';
import { ApplicationDomain, DomainType, DomainStatus } from '../models/applicationDomain.model';
import { DomainNormalizationService } from '../services/domainNormalization.service';
import { DomainResolverService } from '../services/domainResolver.service';
import { seedPlans } from './planAndSubscription.seeder';
import { logger } from '../config/logger';

export const runStage5Migration = async (): Promise<void> => {
  logger.info('Starting Stage 5 Domain Migration...');

  // 1. Update/seed plans with customDomain entitlement limits
  await seedPlans();
  logger.info('Plan entitlements updated successfully.');

  // 2. Ensure every application has a valid default ApplicationDomain
  const applications = await Application.find({}).setOptions({ bypassTenantQuery: true });
  logger.info(`Found ${applications.length} applications to inspect for domain configuration.`);

  for (const app of applications) {
    const defaultHostname = DomainResolverService.generateDefaultHostname(app.slug);
    const existingDefault = await ApplicationDomain.findOne({
      applicationId: app._id,
      type: DomainType.DEFAULT,
    });

    if (!existingDefault) {
      await ApplicationDomain.create({
        applicationId: app._id,
        hostname: defaultHostname,
        type: DomainType.DEFAULT,
        status: DomainStatus.ACTIVE,
        isPrimary: true,
      });
      logger.info(`Created default domain "${defaultHostname}" for app "${app.name}" (${app._id})`);
    } else {
      // Normalize hostname if needed
      const normalized = DomainNormalizationService.normalize(existingDefault.hostname);
      if (normalized !== existingDefault.hostname) {
        existingDefault.hostname = normalized;
        await existingDefault.save();
        logger.info(`Normalized default domain hostname to "${normalized}" for app "${app.name}"`);
      }
    }

    // Ensure exactly 1 primary domain exists for the application
    const primaryCount = await ApplicationDomain.countDocuments({
      applicationId: app._id,
      isPrimary: true,
      status: DomainStatus.ACTIVE,
    });

    if (primaryCount === 0) {
      // Promote default domain to primary
      await ApplicationDomain.updateOne(
        { applicationId: app._id, type: DomainType.DEFAULT },
        { $set: { isPrimary: true, status: DomainStatus.ACTIVE } },
      );
      logger.info(`Restored default domain as primary for app "${app.name}"`);
    } else if (primaryCount > 1) {
      // If multiple primaries, prioritize custom domain if active, else default domain
      const activeCustom = await ApplicationDomain.findOne({
        applicationId: app._id,
        type: DomainType.CUSTOM,
        status: DomainStatus.ACTIVE,
      });

      await ApplicationDomain.updateMany({ applicationId: app._id }, { $set: { isPrimary: false } });

      if (activeCustom) {
        activeCustom.isPrimary = true;
        await activeCustom.save();
      } else {
        await ApplicationDomain.updateOne({ applicationId: app._id, type: DomainType.DEFAULT }, { $set: { isPrimary: true } });
      }
      logger.info(`Fixed duplicate primary domains for app "${app.name}"`);
    }
  }

  // 3. Ensure all custom domains have normalized hostnames
  const customDomains = await ApplicationDomain.find({ type: DomainType.CUSTOM });
  for (const cDom of customDomains) {
    const normalized = DomainNormalizationService.normalize(cDom.hostname);
    if (normalized !== cDom.hostname) {
      cDom.hostname = normalized;
      await cDom.save();
      logger.info(`Normalized custom domain "${cDom.hostname}" to "${normalized}"`);
    }
  }

  // 4. Synchronize indexes
  await ApplicationDomain.syncIndexes();
  logger.info('ApplicationDomain indexes synchronized successfully.');
  logger.info('Stage 5 Domain Migration completed successfully.');
};

// Execute if run directly from CLI
if (require.main === module) {
  mongoose
    .connect(env.MONGO_URI)
    .then(async () => {
      await runStage5Migration();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Stage 5 Migration failed:', err);
      process.exit(1);
    });
}

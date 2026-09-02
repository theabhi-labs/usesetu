/* eslint-disable no-console */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { BillingLifecycleService } from '../services/billingLifecycle.service';
import { JobMonitorService } from '../services/observability/jobMonitor.service';

/**
 * Usage (cron/PM2/CI): node -r tsconfig-paths/register dist/jobs/billingLifecycle.job.js
 * Connects to MongoDB, processes renewals, grace periods, expirations, and dunning notices once, then exits.
 */
const run = async () => {
  await mongoose.connect(env.MONGO_URI);

  const { result } = await JobMonitorService.executeJob('billing-lifecycle', async (ctx) => {
    const report = await BillingLifecycleService.runAutomatedLifecycleCycle();
    const totalProcessed =
      report.remindersSent +
      report.gracePeriodsStarted +
      report.subscriptionsExpired +
      report.dunningSent;

    ctx.recordSuccess(totalProcessed);
    ctx.setMetadata(report as unknown as Record<string, unknown>);
    return report;
  });

  console.log('Billing lifecycle runner finished:', result);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Billing lifecycle job failed:', error);
  process.exit(1);
});

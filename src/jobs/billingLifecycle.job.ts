/* eslint-disable no-console */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { BillingLifecycleService } from '../services/billingLifecycle.service';

/**
 * Usage (cron/PM2/CI): node -r tsconfig-paths/register dist/jobs/billingLifecycle.job.js
 * Connects to MongoDB, processes renewals, grace periods, expirations, and dunning notices once, then exits.
 */
const run = async () => {
  await mongoose.connect(env.MONGO_URI);
  const report = await BillingLifecycleService.runAutomatedLifecycleCycle();
  console.log('Billing lifecycle runner finished:', report);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Billing lifecycle job failed:', error);
  process.exit(1);
});

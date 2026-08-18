/* eslint-disable no-console */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { snapshotDailyMetrics } from '../services/analyticsEngine.service';

/**
 * Usage (cron/PM2/CI, run once daily shortly after midnight):
 *   node -r tsconfig-paths/register dist/jobs/snapshotAnalytics.job.js
 * Snapshots "yesterday" by default so the day being summarized is fully
 * complete. Pass a date (YYYY-MM-DD) as argv[2] to backfill a specific day.
 */
const run = async () => {
  await mongoose.connect(env.MONGO_URI);

  const targetDate =
    process.argv[2] ||
    (() => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    })();

  const snapshot = await snapshotDailyMetrics(targetDate);
  console.log(`Analytics snapshot complete for ${targetDate}:`, snapshot.toObject());

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Analytics snapshot job failed:', error);
  process.exit(1);
});

/* eslint-disable no-console */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { processDueReminders } from '../services/reminderScheduler.service';

/**
 * Usage (cron/PM2/CI): node -r tsconfig-paths/register dist/jobs/processReminders.job.js
 * Connects, processes every due reminder once, disconnects, exits.
 * Run this every 5-15 minutes via your process manager's scheduler — it is
 * intentionally NOT a long-running process itself (see reminderScheduler.service.ts).
 */
const run = async () => {
  await mongoose.connect(env.MONGO_URI);
  const result = await processDueReminders();
  console.log(`Reminder job complete: ${result.processed} sent, ${result.failed} failed`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Reminder job failed:', error);
  process.exit(1);
});

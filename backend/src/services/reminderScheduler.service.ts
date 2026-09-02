import { Reminder, ReminderStatus } from '../models/reminder.model';
import { dispatchNotification } from './notificationDispatch.service';
import { logger } from '../config/logger';

/**
 * Finds every reminder due now or earlier and dispatches it as an in-app +
 * email notification, then marks it sent. Designed to be invoked by an
 * external scheduler — this module intentionally does NOT start its own
 * setInterval/cron, because a long-running in-process timer doesn't survive
 * PM2 cluster mode (would fire once per worker) or serverless deployments.
 * Wire this into: `node -e "require('./dist/jobs/processReminders').run()"`
 * on a cron, or a PM2 `cron_restart`, or a scheduled CI workflow.
 */
export const processDueReminders = async (): Promise<{ processed: number; failed: number }> => {
  const due = await Reminder.find({ status: ReminderStatus.PENDING, scheduledFor: { $lte: new Date() } }).limit(500);

  let processed = 0;
  let failed = 0;

  for (const reminder of due) {
    try {
      await dispatchNotification(String(reminder.user), 'generic_reminder', { message: reminder.message });
      reminder.status = ReminderStatus.SENT;
      reminder.sentAt = new Date();
      await reminder.save();
      processed += 1;
    } catch (error) {
      failed += 1;
      logger.error(`Failed to dispatch reminder ${reminder._id}: ${(error as Error).message}`);
    }
  }

  return { processed, failed };
};

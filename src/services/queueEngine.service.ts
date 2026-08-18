import { getNextSequence } from '../models/counter.model';
import { TokenPriority, PRIORITY_WEIGHT } from '../models/queueToken.model';
import { ApiError } from '../utils/ApiError';

/**
 * Returns today's date as 'YYYY-MM-DD' in server-local time. Token
 * numbering and daily-limit checks are scoped to this string so the
 * sequence resets automatically at midnight with zero cron jobs.
 */
export const getTodayDateString = (): string => new Date().toISOString().split('T')[0];

/**
 * Atomically generates the next token number for a queue on a given day.
 * The counter key is scoped per-queue-per-day, so concurrent token requests
 * from different customers never collide (same guarantee as application
 * numbers — see applicationNumber.service.ts).
 */
export const generateTokenNumber = async (queueId: string, tokenPrefix: string, dateStr: string) => {
  const seq = await getNextSequence(`queue-${queueId}-${dateStr}`);
  return { tokenNumber: `${tokenPrefix}-${String(seq).padStart(3, '0')}`, sequence: seq };
};

export const getPriorityWeight = (priority: TokenPriority): number => PRIORITY_WEIGHT[priority];

/**
 * Estimated wait time for a newly-generated token = (number of people
 * already waiting ahead of it in priority order) x average service time.
 * A simple, cheap heuristic - good enough for a live-display estimate
 * without needing historical service-time analytics.
 */
export const estimateWaitMinutes = (waitingAheadCount: number, estimatedServiceTimeMinutes: number): number =>
  waitingAheadCount * estimatedServiceTimeMinutes;

export const assertDailyLimitNotReached = (dailyLimit: number, issuedToday: number) => {
  if (dailyLimit > 0 && issuedToday >= dailyLimit) {
    throw ApiError.badRequest("Today's token limit for this queue has been reached. Please try again tomorrow.");
  }
};

import { getNextSequence } from '../models/counter.model';
import { env } from '../config/env';

/**
 * Generates application numbers like "CSC-2026-000001".
 * The counter key is scoped per-year so the sequence naturally resets every
 * January without any cron job — `request-2027` simply starts fresh at 1.
 */
export const generateApplicationNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`request-${year}`);
  return `${env.APPLICATION_NUMBER_PREFIX}-${year}-${String(seq).padStart(6, '0')}`;
};

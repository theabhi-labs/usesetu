import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A single-document-per-key atomic counter. Used anywhere the system needs
 * a gap-free, collision-free sequence under concurrent writes (application
 * numbers, invoice numbers, token numbers, receipt numbers, ...).
 *
 * Why not `countDocuments() + 1`: that pattern races under concurrent
 * requests (two customers submitting at the same millisecond can read the
 * same count and generate the same number). `findOneAndUpdate` with `$inc`
 * is a single atomic MongoDB operation — safe under any concurrency level.
 */
export interface ICounter extends Omit<Document, '_id'> {
  _id: string; // the counter key, e.g. "request-2026"
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter: Model<ICounter> = mongoose.model<ICounter>('Counter', counterSchema);

/**
 * Atomically increments and returns the next value for `key`.
 * `upsert: true` means the very first call for a new key creates it starting at 1.
 */
import { tenantLocalStorage } from '../services/tenantContext.service';

export const getNextSequence = async (key: string): Promise<number> => {
  const context = tenantLocalStorage.getStore();
  const tenantPrefix = context?.tenantId ? `${context.tenantId}:` : '';
  const finalKey = `${tenantPrefix}${key}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: finalKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq;
};

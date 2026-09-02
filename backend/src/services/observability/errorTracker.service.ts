import crypto from 'crypto';
import mongoose from 'mongoose';
import { SystemError, ISystemError } from '../../models/systemError.model';
import { LoggerService } from './logger.service';
import { MetricsService } from './metrics.service';
import { env } from '../../config/env';

export interface TrackErrorOptions {
  errorCode?: string;
  message: string;
  stack?: string;
  route: string;
  method: string;
  requestId?: string;
  accountId?: string | mongoose.Types.ObjectId;
  applicationId?: string | mongoose.Types.ObjectId;
  tenantId?: string | mongoose.Types.ObjectId;
  severity?: 'P0' | 'P1' | 'P2' | 'P3' | 'INFO' | 'WARN' | 'ERROR';
}

export class ErrorTrackerService {
  /**
   * Generates a deterministic SHA-256 fingerprint for grouping duplicate errors.
   */
  static generateFingerprint(normalizedRoute: string, method: string, message: string, stackHash?: string): string {
    const raw = `${method.toUpperCase()}:${normalizedRoute}:${message.slice(0, 120)}:${stackHash || ''}`;
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24);
  }

  /**
   * Extract a concise stack hash from Error stack trace
   */
  static getStackHash(stack?: string): string | undefined {
    if (!stack) return undefined;
    const lines = stack
      .split('\n')
      .slice(1, 4)
      .map((l) => l.trim().replace(/:[0-9]+:[0-9]+/g, ''))
      .join('|');
    return crypto.createHash('md5').update(lines).digest('hex').slice(0, 16);
  }

  /**
   * Track, fingerprint, and persist or increment an error record in the database.
   */
  static async trackError(options: TrackErrorOptions): Promise<ISystemError | null> {
    try {
      const normalizedRoute = MetricsService.normalizeRoute(options.route);
      const stackHash = this.getStackHash(options.stack);
      const fingerprint = this.generateFingerprint(
        normalizedRoute,
        options.method,
        options.message,
        stackHash,
      );

      const updateData: Record<string, unknown> = {
        $set: {
          errorCode: options.errorCode || 'INTERNAL_SERVER_ERROR',
          message: options.message,
          stackHash,
          route: normalizedRoute,
          method: options.method.toUpperCase(),
          requestId: options.requestId,
          environment: env.NODE_ENV,
          severity: options.severity || 'ERROR',
          lastSeenAt: new Date(),
          status: 'UNRESOLVED',
        },
        $inc: { occurrenceCount: 1 },
        $setOnInsert: {
          fingerprint,
          firstSeenAt: new Date(),
        },
      };

      if (options.accountId && mongoose.isValidObjectId(options.accountId)) {
        (updateData.$set as Record<string, unknown>).accountId = options.accountId;
      }
      if (options.applicationId && mongoose.isValidObjectId(options.applicationId)) {
        (updateData.$set as Record<string, unknown>).applicationId = options.applicationId;
      }
      if (options.tenantId && mongoose.isValidObjectId(options.tenantId)) {
        (updateData.$set as Record<string, unknown>).tenantId = options.tenantId;
      }

      const errorRecord = await SystemError.findOneAndUpdate(
        { fingerprint },
        updateData,
        { upsert: true, new: true },
      );

      return errorRecord;
    } catch (err) {
      LoggerService.error('Failed to track system error in ErrorTrackerService', err);
      return null;
    }
  }

  /**
   * Fetch paginated list of tracked errors
   */
  static async getErrors(query: {
    page?: number;
    limit?: number;
    severity?: string;
    status?: string;
    search?: string;
  }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.severity) filter.severity = query.severity;
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { message: { $regex: query.search, $options: 'i' } },
        { route: { $regex: query.search, $options: 'i' } },
        { errorCode: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [errors, total] = await Promise.all([
      SystemError.find(filter)
        .sort({ lastSeenAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SystemError.countDocuments(filter),
    ]);

    return {
      errors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Resolve an error fingerprint
   */
  static async resolveError(fingerprintOrId: string) {
    const filter = mongoose.isValidObjectId(fingerprintOrId)
      ? { _id: fingerprintOrId }
      : { fingerprint: fingerprintOrId };

    return SystemError.findOneAndUpdate(
      filter,
      { $set: { status: 'RESOLVED', resolvedAt: new Date() } },
      { new: true },
    );
  }
}

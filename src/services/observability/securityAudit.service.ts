import mongoose from 'mongoose';
import { SecurityEvent, SecurityEventType, SecurityEventSeverity, ISecurityEvent } from '../../models/securityEvent.model';
import { LoggerService, sanitizeLogData } from './logger.service';

export interface RecordSecurityEventOptions {
  eventType: SecurityEventType;
  severity?: SecurityEventSeverity;
  userId?: string | mongoose.Types.ObjectId;
  accountId?: string | mongoose.Types.ObjectId;
  applicationId?: string | mongoose.Types.ObjectId;
  tenantId?: string | mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  method?: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

export class SecurityAuditService {
  /**
   * Records a security event with automatic sanitization
   */
  static async recordEvent(options: RecordSecurityEventOptions): Promise<ISecurityEvent | null> {
    try {
      const sanitizedDetails = options.details ? (sanitizeLogData(options.details) as Record<string, unknown>) : undefined;

      const event = await SecurityEvent.create({
        eventType: options.eventType,
        severity: options.severity || 'MEDIUM',
        userId: options.userId && mongoose.isValidObjectId(options.userId) ? options.userId : undefined,
        accountId: options.accountId && mongoose.isValidObjectId(options.accountId) ? options.accountId : undefined,
        applicationId: options.applicationId && mongoose.isValidObjectId(options.applicationId) ? options.applicationId : undefined,
        tenantId: options.tenantId && mongoose.isValidObjectId(options.tenantId) ? options.tenantId : undefined,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent ? options.userAgent.slice(0, 200) : undefined,
        route: options.route,
        method: options.method,
        requestId: options.requestId,
        details: sanitizedDetails,
      });

      LoggerService.warn(`Security Event: ${options.eventType} [${options.severity || 'MEDIUM'}]`, {
        eventType: options.eventType,
        route: options.route,
        requestId: options.requestId,
      });

      return event;
    } catch (err) {
      LoggerService.error('Failed to log security event', err);
      return null;
    }
  }

  /**
   * Get paginated security events
   */
  static async getEvents(query: {
    page?: number;
    limit?: number;
    eventType?: string;
    severity?: string;
  }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.eventType) filter.eventType = query.eventType;
    if (query.severity) filter.severity = query.severity;

    const [events, total] = await Promise.all([
      SecurityEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SecurityEvent.countDocuments(filter),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

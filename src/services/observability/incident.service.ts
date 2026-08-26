import crypto from 'crypto';
import mongoose from 'mongoose';
import { SystemIncident, ISystemIncident, IncidentSeverity } from '../../models/systemIncident.model';
import { LoggerService } from './logger.service';

export interface CreateIncidentOptions {
  title: string;
  description: string;
  severity: IncidentSeverity;
  source?: string;
  fingerprint?: string;
  affectedService?: string;
  affectedApplications?: (string | mongoose.Types.ObjectId)[];
  metadata?: Record<string, unknown>;
}

export class IncidentService {
  /**
   * Generates a deterministic incident fingerprint
   */
  static generateFingerprint(title: string, source: string, severity: string): string {
    const raw = `${severity}:${source}:${title.slice(0, 100)}`;
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24);
  }

  /**
   * Create or increment an existing open incident (deduplication)
   */
  static async triggerIncident(options: CreateIncidentOptions): Promise<ISystemIncident> {
    const source = options.source || 'alert_engine';
    const fingerprint = options.fingerprint || this.generateFingerprint(options.title, source, options.severity);

    // Look for an existing open or acknowledged incident with same fingerprint
    let incident = await SystemIncident.findOne({
      fingerprint,
      status: { $in: ['OPEN', 'ACKNOWLEDGED'] },
    });

    if (incident) {
      incident.occurrenceCount += 1;
      incident.lastDetectedAt = new Date();
      incident.description = options.description;
      if (options.metadata) {
        incident.metadata = { ...incident.metadata, ...options.metadata };
      }
      await incident.save();
      LoggerService.warn(`Incident incremented [${options.severity}]: ${options.title}`, {
        incidentId: incident._id,
        count: incident.occurrenceCount,
      });
      return incident;
    }

    incident = await SystemIncident.create({
      title: options.title,
      description: options.description,
      severity: options.severity,
      status: 'OPEN',
      source,
      fingerprint,
      affectedService: options.affectedService || 'api',
      affectedApplications: options.affectedApplications || [],
      firstDetectedAt: new Date(),
      lastDetectedAt: new Date(),
      occurrenceCount: 1,
      metadata: options.metadata,
    });

    LoggerService.error(`NEW Incident Opened [${options.severity}]: ${options.title}`, undefined, {
      incidentId: incident._id,
      severity: options.severity,
    });

    return incident;
  }

  /**
   * Acknowledge an incident
   */
  static async acknowledgeIncident(incidentId: string, userId?: string | mongoose.Types.ObjectId): Promise<ISystemIncident | null> {
    const update: Record<string, unknown> = {
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
    };
    if (userId && mongoose.isValidObjectId(userId)) {
      update.acknowledgedBy = userId;
    }

    return SystemIncident.findByIdAndUpdate(incidentId, { $set: update }, { new: true });
  }

  /**
   * Resolve an incident
   */
  static async resolveIncident(incidentId: string, userId?: string | mongoose.Types.ObjectId): Promise<ISystemIncident | null> {
    const update: Record<string, unknown> = {
      status: 'RESOLVED',
      resolvedAt: new Date(),
    };
    if (userId && mongoose.isValidObjectId(userId)) {
      update.resolvedBy = userId;
    }

    return SystemIncident.findByIdAndUpdate(incidentId, { $set: update }, { new: true });
  }

  /**
   * Ignore an incident
   */
  static async ignoreIncident(incidentId: string, userId?: string | mongoose.Types.ObjectId): Promise<ISystemIncident | null> {
    const update: Record<string, unknown> = {
      status: 'IGNORED',
      resolvedAt: new Date(),
    };
    if (userId && mongoose.isValidObjectId(userId)) {
      update.resolvedBy = userId;
    }

    return SystemIncident.findByIdAndUpdate(incidentId, { $set: update }, { new: true });
  }

  /**
   * Query incidents with pagination and filtering
   */
  static async getIncidents(query: {
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
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        { affectedService: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [incidents, total] = await Promise.all([
      SystemIncident.find(filter)
        .sort({ lastDetectedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SystemIncident.countDocuments(filter),
    ]);

    return {
      incidents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

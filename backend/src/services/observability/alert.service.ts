import { IncidentService } from './incident.service';
import { IncidentSeverity } from '../../models/systemIncident.model';
import { PlatformNotification } from '../../models/platformNotification.model';
import { Account } from '../../models/account.model';
import { LoggerService } from './logger.service';

export interface TriggerAlertOptions {
  title: string;
  description: string;
  severity: IncidentSeverity;
  source?: string;
  metadata?: Record<string, unknown>;
  notifyAccountOwners?: boolean;
}

export class AlertService {
  /**
   * Triggers an alert, opens or increments an incident, and optionally sends platform notifications.
   */
  static async triggerAlert(options: TriggerAlertOptions) {
    try {
      const incident = await IncidentService.triggerIncident({
        title: options.title,
        description: options.description,
        severity: options.severity,
        source: options.source || 'alert_engine',
        metadata: options.metadata,
      });

      // For P0 and P1 alerts, also emit platform notification to account owners if requested
      if (options.notifyAccountOwners && (options.severity === 'P0' || options.severity === 'P1')) {
        const accounts = await Account.find().limit(50).select('_id');
        const now = new Date();
        const notificationPromises = accounts.map((acc) =>
          PlatformNotification.create({
            accountId: acc._id,
            type: 'system_alert',
            title: `[System Notice] ${options.title}`,
            message: options.description,
            severity: options.severity === 'P0' ? 'critical' : 'warning',
            isRead: false,
            createdAt: now,
          }).catch((err) => {
            LoggerService.warn('Failed to dispatch alert notification to account', { err: String(err) });
          }),
        );
        await Promise.all(notificationPromises);
      }

      return incident;
    } catch (err) {
      LoggerService.error('Failed to trigger alert in AlertService', err);
      return null;
    }
  }

  // Pre-configured Alert Rules
  static async notifyDatabaseDown(error: unknown) {
    return this.triggerAlert({
      title: 'Database Connectivity Lost',
      description: `MongoDB is unreachable: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'P0',
      source: 'database_monitor',
      notifyAccountOwners: false,
    });
  }

  static async notifyWebhookFailureSpike(failureCount: number, timeWindowMinutes = 15) {
    return this.triggerAlert({
      title: 'High Razorpay Webhook Failure Rate',
      description: `Detected ${failureCount} failed webhook events in the last ${timeWindowMinutes} minutes.`,
      severity: 'P1',
      source: 'webhook_monitor',
    });
  }

  static async notifyHighErrorRate(errorRatePercent: number) {
    return this.triggerAlert({
      title: 'Elevated API Error Rate',
      description: `API error rate is at ${errorRatePercent}%, exceeding safe threshold.`,
      severity: 'P2',
      source: 'metrics_monitor',
    });
  }

  static async notifyHighDatabaseLatency(latencyMs: number) {
    return this.triggerAlert({
      title: 'High Database Latency Detected',
      description: `MongoDB ping response time is ${latencyMs}ms, exceeding 500ms threshold.`,
      severity: 'P1',
      source: 'database_monitor',
    });
  }
}

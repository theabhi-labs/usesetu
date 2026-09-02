import { User } from '../models/user.model';
import { NotificationTemplate } from '../models/notificationTemplate.model';
import { NotificationPreference } from '../models/notificationPreference.model';
import {
  Notification,
  NotificationChannel,
  NotificationType,
  NotificationDeliveryStatus,
} from '../models/notification.model';
import { sendEmail, wrapBrandedEmail } from './email.service';
import { renderTemplate } from '../utils/templateRenderer';
import { logger } from '../config/logger';

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  request_created: {
    subject: 'Application Received - {{applicationNumber}}',
    body: 'Hi {{customerName}}, your application {{applicationNumber}} for {{serviceName}} has been received.',
  },
  request_stage_changed: {
    subject: 'Application Update - {{applicationNumber}}',
    body: 'Hi {{customerName}}, your application {{applicationNumber}} status changed to "{{stageName}}".',
  },
  payment_received: {
    subject: 'Payment Received - {{applicationNumber}}',
    body: 'Hi {{customerName}}, we received Rs.{{amount}} for application {{applicationNumber}}.',
  },
  generic_reminder: {
    subject: 'Reminder from CSC OS',
    body: '{{message}}',
  },
};

const resolveTemplate = async (key: string, channel: 'email' | 'in_app') => {
  const stored = await NotificationTemplate.findOne({ key, channel, isActive: true }).lean();
  if (stored) return { subject: stored.subject || key, body: stored.bodyTemplate };

  const fallback = DEFAULT_TEMPLATES[key];
  return fallback ? { subject: fallback.subject, body: fallback.body } : null;
};

/**
 * Sends (or records) a notification to a user through a template key,
 * honoring their channel preferences. Never throws — a notification
 * failure must not break the business operation that triggered it; errors
 * are logged and, for email, recorded on the Notification row for a retry
 * job to pick up later.
 */
export const dispatchNotification = async (
  userId: string,
  templateKey: string,
  variables: Record<string, unknown>,
  options: { type?: NotificationType; sendEmailChannel?: boolean; sendInAppChannel?: boolean } = {},
): Promise<void> => {
  try {
    const [user, preference] = await Promise.all([
      User.findById(userId).select('name email'),
      NotificationPreference.findOne({ user: userId }),
    ]);
    if (!user) return;

    const emailEnabled = (options.sendEmailChannel ?? true) && (preference?.emailEnabled ?? true);
    const inAppEnabled = (options.sendInAppChannel ?? true) && (preference?.inAppEnabled ?? true);

    if (inAppEnabled) {
      const template = await resolveTemplate(templateKey, 'in_app');
      if (template) {
        const message = renderTemplate(template.body, variables);
        await Notification.create({
          user: userId,
          type: options.type || NotificationType.INFO,
          channel: NotificationChannel.IN_APP,
          title: renderTemplate(template.subject, variables),
          message,
          data: variables,
          status: NotificationDeliveryStatus.SENT,
          sentAt: new Date(),
          triggeredByEvent: templateKey,
        });
      }
    }

    if (emailEnabled) {
      const template = await resolveTemplate(templateKey, 'email');
      if (template) {
        const subject = renderTemplate(template.subject, variables);
        const body = renderTemplate(template.body, variables);

        const notification = await Notification.create({
          user: userId,
          type: options.type || NotificationType.INFO,
          channel: NotificationChannel.EMAIL,
          title: subject,
          message: body,
          data: variables,
          status: NotificationDeliveryStatus.PENDING,
          triggeredByEvent: templateKey,
        });

        try {
          await sendEmail({
            to: [{ email: user.email, name: user.name }],
            subject,
            htmlContent: wrapBrandedEmail(subject, `<p>${body}</p>`),
          });
          notification.status = NotificationDeliveryStatus.SENT;
          notification.sentAt = new Date();
          await notification.save();
        } catch (error) {
          notification.status = NotificationDeliveryStatus.FAILED;
          notification.error = (error as Error).message;
          notification.retryCount += 1;
          await notification.save();
        }
      }
    }
  } catch (error) {
    logger.error(`dispatchNotification failed for user=${userId} template=${templateKey}: ${(error as Error).message}`);
  }
};

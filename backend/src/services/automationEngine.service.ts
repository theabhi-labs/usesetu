import { AutomationRule, RuleConditionOperator, RuleActionType, EventType } from '../models/automationRule.model';
import { Reminder } from '../models/reminder.model';
import { dispatchNotification } from './notificationDispatch.service';
import { logger } from '../config/logger';

const getField = (obj: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj);

const evaluateCondition = (operator: RuleConditionOperator, actual: unknown, expected: unknown): boolean => {
  switch (operator) {
    case RuleConditionOperator.EQUALS:
      return actual === expected;
    case RuleConditionOperator.NOT_EQUALS:
      return actual !== expected;
    case RuleConditionOperator.GREATER_THAN:
      return Number(actual) > Number(expected);
    case RuleConditionOperator.LESS_THAN:
      return Number(actual) < Number(expected);
    case RuleConditionOperator.CONTAINS:
      return String(actual ?? '').includes(String(expected));
    default:
      return false;
  }
};

/**
 * Evaluates every active AutomationRule registered for `eventType` against
 * the given payload, and executes the actions of every rule that matches.
 * A payload must always include `userId` (who the notification is for) and
 * whatever fields the admin's rule conditions/templates reference.
 */
export const handleEvent = async (eventType: EventType, payload: Record<string, unknown>): Promise<void> => {
  const rules = await AutomationRule.find({ eventType, isActive: true }).sort({ priority: 1 }).lean();

  for (const rule of rules) {
    const results = rule.conditions.map((c) => evaluateCondition(c.operator, getField(payload, c.field), c.value));
    const matched = rule.conditions.length === 0 || (rule.logicType === 'OR' ? results.some(Boolean) : results.every(Boolean));
    if (!matched) continue;

    for (const action of rule.actions) {
      try {
        await executeAction(action.type, action, payload);
      } catch (error) {
        logger.error(`Automation action failed (rule=${rule.name}, action=${action.type}): ${(error as Error).message}`);
      }
    }
  }
};

const executeAction = async (
  type: RuleActionType,
  action: { templateKey?: string; reminderOffsetHours?: number; reminderMessage?: string },
  payload: Record<string, unknown>,
): Promise<void> => {
  const userId = payload.userId as string | undefined;
  if (!userId) return;

  switch (type) {
    case RuleActionType.SEND_EMAIL:
      if (action.templateKey) await dispatchNotification(userId, action.templateKey, payload, { sendInAppChannel: false });
      break;
    case RuleActionType.CREATE_IN_APP_NOTIFICATION:
      if (action.templateKey) await dispatchNotification(userId, action.templateKey, payload, { sendEmailChannel: false });
      break;
    case RuleActionType.CREATE_REMINDER:
      if (payload.targetType && payload.targetId) {
        await Reminder.create({
          targetType: payload.targetType,
          targetId: payload.targetId,
          user: userId,
          message: action.reminderMessage || 'Reminder',
          scheduledFor: new Date(Date.now() + (action.reminderOffsetHours || 24) * 60 * 60 * 1000),
        });
      }
      break;
  }
};

import { EventType } from '../models/automationRule.model';
import { handleEvent } from './automationEngine.service';
import { logger } from '../config/logger';

/**
 * Emits a domain event to the automation engine. Deliberately NOT awaited
 * by callers (fire-and-forget) and deliberately does NOT persist a raw
 * event log to MongoDB — at 10,000+ concurrent users, writing a document
 * for every single event (login, page view, stage change, ...) would be
 * the single biggest write-amplification risk in the system. Instead:
 *   - the *outcome* of an event (a Notification, a Reminder) is persisted,
 *     because that's what the product actually needs to query later.
 *   - the raw event itself only needs to exist for the few milliseconds it
 *     takes the automation engine to evaluate matching rules.
 * If a full event-sourcing audit trail is ever required, swap this
 * function's body for a queue publish (e.g. BullMQ/Redis Streams) without
 * changing any call site — every module already calls emitEvent(), not
 * handleEvent() directly.
 */
export const emitEvent = (eventType: EventType, payload: Record<string, unknown>): void => {
  handleEvent(eventType, payload).catch((error) => {
    logger.error(`emitEvent(${eventType}) failed: ${(error as Error).message}`);
  });
};

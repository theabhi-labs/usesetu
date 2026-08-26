import winston from 'winston';
import { env, isProd } from '../../config/env';
import { AsyncLocalStorage } from 'async_hooks';

// Async local storage for request correlation context
export interface RequestContextData {
  requestId?: string;
  accountId?: string;
  applicationId?: string;
  tenantId?: string;
  userId?: string;
}

export const requestContextStore = new AsyncLocalStorage<RequestContextData>();

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'jwt',
  'authorization',
  'cookie',
  'secret',
  'apikey',
  'razorpaykeysecret',
  'razorpaywebhooksecret',
  'card',
  'cardnumber',
  'cvv',
  'otp',
  'upipin',
  'pin',
  'auth',
  'privatekey',
  'clientsecret',
]);

/**
 * Recursively sanitize objects to mask or remove sensitive fields
 */
export function sanitizeLogData(data: unknown, depth = 0): unknown {
  if (depth > 6 || data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
    if (
      SENSITIVE_KEYS.has(lowerKey) ||
      lowerKey.includes('secret') ||
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('apikey') ||
      lowerKey.includes('auth') ||
      lowerKey.includes('jwt') ||
      lowerKey.includes('cookie')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export interface StructuredLogPayload {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  service?: string;
  environment?: string;
  event?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  requestId?: string;
  accountId?: string;
  applicationId?: string;
  tenantId?: string;
  userId?: string;
  error?: unknown;
}

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(sanitizeLogData(meta))}` : '';
    return `[${ts}] ${level}: ${stack || message}${metaStr}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const internalLogger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export class LoggerService {
  private static serviceName = 'usesetu-api';

  private static buildLogEntry(payload: StructuredLogPayload) {
    const store = requestContextStore.getStore() || {};

    const entry = {
      timestamp: new Date().toISOString(),
      service: payload.service || this.serviceName,
      environment: payload.environment || env.NODE_ENV,
      level: payload.level,
      message: payload.message,
      event: payload.event,
      durationMs: payload.durationMs,
      requestId: payload.requestId || store.requestId,
      accountId: payload.accountId || store.accountId,
      applicationId: payload.applicationId || store.applicationId,
      tenantId: payload.tenantId || store.tenantId,
      userId: payload.userId || store.userId,
      metadata: payload.metadata ? sanitizeLogData(payload.metadata) : undefined,
      stack: payload.error instanceof Error ? payload.error.stack : undefined,
    };

    return sanitizeLogData(entry) as Record<string, unknown>;
  }

  static debug(message: string, meta?: Record<string, unknown>, event?: string): void {
    const entry = this.buildLogEntry({ level: 'debug', message, metadata: meta, event });
    internalLogger.debug(message, entry);
  }

  static info(message: string, meta?: Record<string, unknown>, event?: string): void {
    const entry = this.buildLogEntry({ level: 'info', message, metadata: meta, event });
    internalLogger.info(message, entry);
  }

  static warn(message: string, meta?: Record<string, unknown>, event?: string): void {
    const entry = this.buildLogEntry({ level: 'warn', message, metadata: meta, event });
    internalLogger.warn(message, entry);
  }

  static error(message: string, error?: unknown, meta?: Record<string, unknown>, event?: string): void {
    const entry = this.buildLogEntry({ level: 'error', message, error, metadata: meta, event });
    internalLogger.error(message, entry);
  }

  static fatal(message: string, error?: unknown, meta?: Record<string, unknown>, event?: string): void {
    const entry = this.buildLogEntry({ level: 'fatal', message, error, metadata: meta, event });
    internalLogger.error(`FATAL: ${message}`, entry);
  }
}

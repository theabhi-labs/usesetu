import rateLimit from 'express-rate-limit';
import { SecurityAuditService } from '../services/observability/securityAudit.service';

/**
 * Custom rate limiter factory with standardized 429 response and security logging
 */
export const createRouteRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  name: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);

      SecurityAuditService.recordEvent({
        eventType: 'RATE_LIMIT_EXCEEDED',
        severity: 'MEDIUM',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        route: req.originalUrl || req.path,
        method: req.method,
        requestId: req.requestId,
        details: { limiter: options.name, limit: options.max, windowMs: options.windowMs },
      }).catch(() => {});

      res.status(429).json({
        success: false,
        message: options.message || 'Too many requests, please try again later.',
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: options.message || 'Too many requests, please try again later.',
          requestId: req.requestId,
          retryAfter: retryAfterSeconds,
        },
      });
    },
  });
};

// Route-specific Limiters
export const authLimiter = createRouteRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  name: 'auth_limiter',
});

export const passwordResetLimiter = createRouteRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many password reset requests. Please try again after 1 hour.',
  name: 'password_reset_limiter',
});

export const domainVerificationLimiter = createRouteRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many domain verification checks. Please wait before retrying.',
  name: 'domain_verification_limiter',
});

export const reconcileLimiter = createRouteRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Reconciliation rate limit reached. Please wait before retrying.',
  name: 'reconcile_limiter',
});

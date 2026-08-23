import { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import { env } from '../config/env';

/**
 * Applies OWASP-recommended security middlewares to the Express app.
 * Call this once during app bootstrap, before routes are mounted.
 */
export const applySecurityMiddlewares = (app: Application): void => {
  app.use(helmet());

  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    }),
  );

  // Global rate limiter — tighter limits are applied per-route for auth endpoints
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.NODE_ENV === 'development' ? 10000 : env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please try again later.' },
    }),
  );

  app.use(mongoSanitize()); // strips $ and . operators from req.body/query/params
  app.use(xss()); // sanitizes user input from malicious HTML/JS
  app.use(hpp()); // protects against HTTP Parameter Pollution
};

/**
 * Strict rate limiter for sensitive auth routes (login, OTP, forgot-password)
 * to slow down brute-force / credential-stuffing attempts.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again after 15 minutes.' },
});

export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Please try again after 10 minutes.' },
});

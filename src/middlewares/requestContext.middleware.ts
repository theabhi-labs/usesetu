import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { requestContextStore } from '../services/observability/logger.service';

/**
 * Middleware that extracts or generates an X-Request-ID,
 * attaches it to the request and response headers,
 * and enters the AsyncLocalStorage request context.
 */
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incomingId = req.headers['x-request-id'] as string | undefined;
  const requestId = (incomingId && incomingId.trim().length > 0) ? incomingId : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  requestContextStore.run({ requestId }, () => {
    next();
  });
};

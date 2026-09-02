import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../services/observability/metrics.service';

/**
 * Middleware that captures request duration and response status,
 * recording metrics asynchronously without blocking response delivery.
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    MetricsService.recordRequest(req.method, req.originalUrl || req.path, res.statusCode, durationMs);
  });

  next();
};

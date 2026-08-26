import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { DatabaseHealthService } from '../services/observability/databaseHealth.service';
import { MetricsService } from '../services/observability/metrics.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../package.json');

/**
 * Basic health endpoint: GET /health
 * Public, safe, lightweight.
 */
export const getBasicHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    service: 'usesetu-api',
    version: packageJson.version || '1.0.0',
    environment: env.NODE_ENV,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Liveness probe: GET /health/live
 * Strictly process-level health. Does NOT touch database or external dependencies.
 */
export const getLiveness = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Readiness probe: GET /health/ready
 * Checks critical database connectivity required to serve production traffic.
 */
export const getReadiness = (_req: Request, res: Response): void => {
  const isConnected = mongoose.connection.readyState === 1;

  if (isConnected) {
    res.status(200).json({
      status: 'ready',
      dependencies: {
        mongodb: 'connected',
      },
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      dependencies: {
        mongodb: 'disconnected',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Deep diagnostic probe: GET /health/deep
 * Protected diagnostic endpoint (Requires SUPER_ADMIN or internal authentication).
 * Never exposes credentials, secrets, or env dumps.
 */
export const getDeepHealth = async (_req: Request, res: Response): Promise<void> => {
  const dbHealth = await DatabaseHealthService.checkHealth();
  const perfMetrics = MetricsService.getPerformanceSummary();
  const memoryUsage = process.memoryUsage();

  const isHealthy = dbHealth.status === 'healthy' || dbHealth.status === 'warning';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'usesetu-api',
    version: packageJson.version || '1.0.0',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    database: dbHealth,
    memory: {
      rssMB: Math.round(memoryUsage.rss / (1024 * 1024)),
      heapTotalMB: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
      heapUsedMB: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
    },
    performance: {
      totalRequests: perfMetrics.totalRequests,
      requestsPerMinute: perfMetrics.requestsPerMinute,
      errorRatePercent: perfMetrics.errorRatePercent,
      p50Ms: perfMetrics.p50Ms,
      p95Ms: perfMetrics.p95Ms,
      p99Ms: perfMetrics.p99Ms,
    },
    timestamp: new Date().toISOString(),
  });
};

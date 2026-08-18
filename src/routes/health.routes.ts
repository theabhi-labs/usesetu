import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../package.json');

const router = Router();

/**
 * /health — general status, safe to hit from a browser/monitoring dashboard.
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'CSC OS API is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * /health/live — liveness probe. Returns 200 as long as the Node process
 * can respond at all; deliberately checks NOTHING external (no DB call).
 * A container orchestrator restarts the pod/process if this ever fails —
 * it should never fail just because MongoDB is briefly unreachable.
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, status: 'alive' });
});

/**
 * /health/ready — readiness probe. Returns 503 if MongoDB isn't connected,
 * so a load balancer stops routing traffic to this instance until it
 * recovers, instead of serving 500s to real users.
 */
router.get('/ready', (_req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({
    success: isDbConnected,
    status: isDbConnected ? 'ready' : 'not_ready',
    dependencies: { mongodb: isDbConnected ? 'connected' : 'disconnected' },
  });
});

/**
 * /health/version — build/version info for deploy verification.
 */
router.get('/version', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    version: packageJson.version,
    environment: env.NODE_ENV,
    nodeVersion: process.version,
  });
});

export default router;

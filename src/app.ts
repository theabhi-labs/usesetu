import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { applySecurityMiddlewares } from './middlewares/security.middleware';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { notFound } from './middlewares/notFound.middleware';
import { logger } from './config/logger';
import { isDev } from './config/env';
import v1Routes from './routes';
import healthRoutes from './routes/health.routes';

const app: Application = express();

// Security (helmet, cors, rate-limit, mongo-sanitize, xss, hpp)
applySecurityMiddlewares(app);

// Body parsing (with rawBody capture for webhook signature verification)
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
if (isDev) {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (message: string) => logger.info(message.trim()) },
    }),
  );
}

// Health checks (liveness/readiness/version) — kept outside /api/v1 since
// they're infrastructure endpoints, not part of the versioned API surface.
app.use('/health', healthRoutes);

import { tenantResolver } from './middlewares/tenant.middleware';
import { getPublicApplicationSitemap, getPublicApplicationRobots } from './controllers/publicApplication.controller';

// Root SEO files for tenant websites
app.get('/sitemap.xml', getPublicApplicationSitemap);
app.get('/robots.txt', getPublicApplicationRobots);

// API v1
app.use('/api/v1', tenantResolver, v1Routes);

// 404 + centralized error handler (must be last)
app.use(notFound);
app.use(errorHandler);

export default app;

import app from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { logger } from './config/logger';
import { ensureEssentialPlatformData } from './seeders/defaultTemplates.seeder';

const startServer = async (): Promise<void> => {
  await connectDB();
  await ensureEssentialPlatformData();

  const server = app.listen(env.PORT, () => {
    logger.info(`CSC OS API running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      logger.info('Server closed. Process exiting.');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
  });

  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    process.exit(1);
  });
};

startServer().catch((error) => {
  logger.error(`Failed to start server: ${(error as Error).message}`);
  process.exit(1);
});

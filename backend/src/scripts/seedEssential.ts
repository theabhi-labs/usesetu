import { connectDB, disconnectDB } from '../config/db';
import { ensureEssentialPlatformData } from '../seeders/defaultTemplates.seeder';
import { logger } from '../config/logger';

const run = async () => {
  try {
    await connectDB();
    await ensureEssentialPlatformData();
    logger.info('Database seeded with essential templates and plans.');
  } catch (err: any) {
    logger.error(`Seeding failed: ${err.message}`);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

run();

import mongoose from 'mongoose';
import { env } from '../config/env';
import { migrateToTenants } from '../seeders/tenantMigration';

const run = async () => {
  console.log('Connecting to database for manual tenant migration...');
  await mongoose.connect(env.MONGO_URI);
  console.log('Database connected.');

  try {
    await migrateToTenants();
    console.log('Migration task finished successfully.');
  } catch (err) {
    console.error('Migration failed with error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
};

run();

/* eslint-disable no-console */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { Role } from '../types/auth.types';

/**
 * Usage: ts-node -r tsconfig-paths/register src/seeders/superAdmin.seeder.ts
 * Creates the first Super Admin account for a fresh CSC OS installation.
 * Safe to re-run — it skips creation if a Super Admin already exists.
 */
const seedSuperAdmin = async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected to MongoDB for seeding...');

  const existing = await User.findOne({ role: Role.SUPER_ADMIN });
  if (existing) {
    console.log(`Super Admin already exists: ${existing.email}. Skipping.`);
    await mongoose.disconnect();
    return;
  }

  const name = process.env.SEED_SUPER_ADMIN_NAME || 'Super Admin';
  const email = process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@cscos.local';
  const mobile = process.env.SEED_SUPER_ADMIN_MOBILE || '9999999999';
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD || 'ChangeMe@123';

  const superAdmin = await User.create({
    name,
    email,
    mobile,
    password,
    role: Role.SUPER_ADMIN,
    isEmailVerified: true,
    isActive: true,
  });

  console.log('✅ Super Admin created successfully:');
  console.log(`   Email:    ${superAdmin.email}`);
  console.log(`   Mobile:   ${superAdmin.mobile}`);
  console.log(`   Password: ${password} (change this immediately after first login)`);

  await mongoose.disconnect();
};

seedSuperAdmin().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});

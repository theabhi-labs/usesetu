import mongoose from 'mongoose';
import { Tenant, TenantStatus } from '../models/tenant.model';
import { User } from '../models/user.model';

export const DEFAULT_TENANT_ID = '60d5ec4b1f6d3f2b4c8b4567';

export const migrateToTenants = async (): Promise<void> => {
  console.log('Starting tenant migration and backfill...');

  // Drop obsolete global unique indexes from the users collection
  const usersCol = mongoose.connection.collection('users');
  try {
    await usersCol.dropIndex('email_1');
    console.log('Dropped obsolete global email index (email_1).');
  } catch (err) {
    // Index may not exist, safe to ignore
  }
  try {
    await usersCol.dropIndex('mobile_1');
    console.log('Dropped obsolete global mobile index (mobile_1).');
  } catch (err) {
    // Index may not exist, safe to ignore
  }

  // Ensure compound unique indexes are built
  try {
    await User.createIndexes();
    console.log('Successfully created tenant-scoped compound indexes.');
  } catch (err) {
    console.error('Error creating compound unique indexes:', err);
  }

  // 1. Ensure Default Tenant exists
  let defaultTenant = await Tenant.findById(DEFAULT_TENANT_ID);
  if (!defaultTenant) {
    defaultTenant = await Tenant.create({
      _id: new mongoose.Types.ObjectId(DEFAULT_TENANT_ID),
      name: 'Default CSC Center',
      slug: 'default-csc',
      status: TenantStatus.ACTIVE,
      category: 'digital_service_center',
    });
    console.log(`Created default Tenant with ID: ${DEFAULT_TENANT_ID}`);
  } else {
    console.log('Default Tenant already exists.');
  }

  const tenantObjectId = new mongoose.Types.ObjectId(DEFAULT_TENANT_ID);

  // 2. Migrate WebsiteSettings singleton
  const websiteSettingsCol = mongoose.connection.collection('websitesettings');
  const oldSetting = await websiteSettingsCol.findOne({ _id: 'singleton' as any });
  if (oldSetting) {
    const newSetting: any = {
      ...oldSetting,
      _id: DEFAULT_TENANT_ID as any,
      tenantId: tenantObjectId,
    };
    // Delete potential existing duplicate to be idempotent
    await websiteSettingsCol.deleteOne({ _id: DEFAULT_TENANT_ID as any });
    await websiteSettingsCol.insertOne(newSetting);
    await websiteSettingsCol.deleteOne({ _id: 'singleton' as any });
    console.log('Successfully migrated WebsiteSettings singleton to default Tenant Settings.');
  }

  // 3. List of collections to backfill with tenantId
  const collectionsToMigrate = [
    'analyticssnapshots',
    'announcements',
    'appointments',
    'appointmentsettings',
    'auditlogs',
    'automationrules',
    'banners',
    'categories',
    'dashboardwidgets',
    'faqs',
    'forms',
    'formsubmissions',
    'invoices',
    'lockerdocuments',
    'mediaassets',
    'menus',
    'notifications',
    'notificationpreferences',
    'notificationtemplates',
    'pages',
    'payments',
    'queues',
    'queuetokens',
    'receipts',
    'refunds',
    'reminders',
    'requests',
    'requestactivities',
    'requestcomments',
    'savedreports',
    'services',
    'workflowhistories',
    'workflows'
  ];

  for (const colName of collectionsToMigrate) {
    try {
      const col = mongoose.connection.collection(colName);
      const result = await col.updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: tenantObjectId } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Backfilled ${result.modifiedCount} documents in collection: ${colName}`);
      }
    } catch (err) {
      console.error(`Error migrating collection ${colName}:`, err);
    }
  }

  // 4. Backfill non-super_admin Users
  try {
    const usersCol = mongoose.connection.collection('users');
    const result = await usersCol.updateMany(
      {
        role: { $ne: 'super_admin' },
        tenantId: { $exists: false }
      },
      { $set: { tenantId: tenantObjectId } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Backfilled ${result.modifiedCount} users with default Tenant ID.`);
    }
  } catch (err) {
    console.error('Error migrating users collection:', err);
  }

  // 5. Seed platform templates, accounts, and application records
  try {
    const { ApplicationTemplate, TemplateStatus } = await import('../models/applicationTemplate.model');
    const { Account, AccountStatus } = await import('../models/account.model');
    const { Application, ApplicationStatus } = await import('../models/application.model');

    let dscTemplate = await ApplicationTemplate.findOne({ slug: 'digital-service-center' });
    if (!dscTemplate) {
      dscTemplate = await ApplicationTemplate.create({
        name: 'Digital Service Center',
        slug: 'digital-service-center',
        category: 'digital_service_center',
        description: 'Reusable blueprint for creating Common Service Centers',
        status: TemplateStatus.ACTIVE,
        version: 1,
      });
      console.log('Created Digital Service Center application template.');
    }

    const adminUser = await User.findOne({ role: 'admin' }).setOptions({ bypassTenantQuery: true });
    const superAdminUser = await User.findOne({ role: 'super_admin' }).setOptions({ bypassTenantQuery: true });
    const targetOwner = adminUser || superAdminUser;

    if (targetOwner) {
      let account = await Account.findOne({ ownerUserId: targetOwner._id });
      if (!account) {
        account = await Account.create({
          ownerUserId: targetOwner._id,
          name: `${targetOwner.name}'s Account`,
          status: AccountStatus.ACTIVE,
        });
        console.log(`Created platform Account for user: ${targetOwner.email}`);
      }

      if (defaultTenant && !defaultTenant.accountId) {
        defaultTenant.accountId = account._id as any;
        await defaultTenant.save();
        console.log('Linked default Tenant to platform Account.');
      }

      let app = await Application.findOne({ slug: 'default-csc' }).setOptions({ bypassTenantQuery: true });
      if (!app) {
        app = await Application.create({
          _id: new mongoose.Types.ObjectId('60d5ec4b1f6d3f2b4c8b1111'),
          tenantId: tenantObjectId,
          accountId: account._id,
          templateId: dscTemplate._id,
          templateVersion: dscTemplate.version,
          name: 'Default CSC Center',
          slug: 'default-csc',
          status: ApplicationStatus.ACTIVE,
        });
        console.log('Created first Application record for Default CSC Center.');
      }

      // Ensure default ApplicationDomain exists for default application
      const { DomainResolverService } = await import('../services/domainResolver.service');
      await DomainResolverService.createDefaultDomain(app._id, app.slug);
      console.log('Ensured default domain for Default CSC Center.');
    } else {
      console.warn('No admin or super_admin found in database to link default Account.');
    }

    // 6. Seed plans and backfill subscriptions
    const { seedPlansAndSubscriptions } = await import('./planAndSubscription.seeder');
    await seedPlansAndSubscriptions();

  } catch (err) {
    console.error('Error seeding platform layer records:', err);
  }

  console.log('Tenant migration and backfill completed successfully.');
};

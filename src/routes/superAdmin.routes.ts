import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { Role } from '../types/auth.types';
import {
  getSuperAdminOverview,
  getSuperAdminTenants,
  getSuperAdminTenantDetails,
  getSuperAdminRequests,
  getSuperAdminRevenue,
  getSuperAdminPlans,
  createSuperAdminPlan,
  updateSuperAdminPlan,
} from '../controllers/superAdmin.controller';

const router = Router();

// Strictly enforce authentication & SUPER_ADMIN authorization
router.use(isAuthenticated, authorizeRoles(Role.SUPER_ADMIN));

// 1. Global Overview
router.get('/overview', getSuperAdminOverview);

// 2. Tenants Directory
router.get('/tenants', getSuperAdminTenants);
router.get('/tenants/:id', getSuperAdminTenantDetails);

// 3. Request Watchdog
router.get('/requests', getSuperAdminRequests);

// 4. Financial Analytics & Revenue
router.get('/revenue', getSuperAdminRevenue);

// 5. Subscription Plans Management
router.get('/plans', getSuperAdminPlans);
router.post('/plans', createSuperAdminPlan);
router.patch('/plans/:id', updateSuperAdminPlan);

export default router;

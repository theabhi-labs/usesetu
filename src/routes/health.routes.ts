import { Router } from 'express';
import {
  getBasicHealth,
  getLiveness,
  getReadiness,
  getDeepHealth,
} from '../controllers/health.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { Role } from '../types/auth.types';

const router = Router();

// Public infrastructure health probes
router.get('/', getBasicHealth);
router.get('/live', getLiveness);
router.get('/ready', getReadiness);

// Protected deep diagnostics (SUPER_ADMIN only)
router.get('/deep', isAuthenticated, authorizeRoles(Role.SUPER_ADMIN), getDeepHealth);

export default router;

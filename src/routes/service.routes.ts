import { Router } from 'express';
import {
  createService,
  getServices,
  getPublicServices,
  getFeaturedServices,
  getPublicServiceBySlug,
  getServiceById,
  updateService,
  deleteService,
  toggleServiceStatus,
  toggleServiceFeatured,
  reorderServices,
} from '../controllers/service.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadImage } from '../middlewares/upload.middleware';
import { Role } from '../types/auth.types';
import {
  createServiceSchema,
  updateServiceSchema,
  serviceIdParamSchema,
  serviceQuerySchema,
} from '../validators/service.validator';

const router = Router();

// Public — no auth, used by the customer-facing website
router.get('/public', validate(serviceQuerySchema), getPublicServices);
router.get('/featured', getFeaturedServices);
router.get('/public/:slug', getPublicServiceBySlug);

// Manage routes — read operations allowed for Admin, Super Admin, and Staff
router.use(isAuthenticated);

router.get('/', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF), validate(serviceQuerySchema), getServices);
router.get('/:id', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF), validate(serviceIdParamSchema), getServiceById);

// Mutations restricted to Admin/Super Admin
router.use(authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN));

router.post('/', uploadImage.single('image'), validate(createServiceSchema), createService);
router.patch('/reorder', reorderServices);
router.put('/:id', uploadImage.single('image'), validate(updateServiceSchema), updateService);
router.patch('/:id/status', validate(serviceIdParamSchema), toggleServiceStatus);
router.patch('/:id/featured', validate(serviceIdParamSchema), toggleServiceFeatured);
router.delete('/:id', authorizeRoles(Role.SUPER_ADMIN), validate(serviceIdParamSchema), deleteService);

export default router;

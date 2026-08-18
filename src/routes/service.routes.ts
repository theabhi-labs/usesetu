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

// Admin/Super Admin managed routes
router.use(isAuthenticated, authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN));

router.get('/', validate(serviceQuerySchema), getServices);
router.post('/', uploadImage.single('image'), validate(createServiceSchema), createService);
router.patch('/reorder', reorderServices);
router.get('/:id', validate(serviceIdParamSchema), getServiceById);
router.put('/:id', uploadImage.single('image'), validate(updateServiceSchema), updateService);
router.patch('/:id/status', validate(serviceIdParamSchema), toggleServiceStatus);
router.patch('/:id/featured', validate(serviceIdParamSchema), toggleServiceFeatured);
router.delete('/:id', authorizeRoles(Role.SUPER_ADMIN), validate(serviceIdParamSchema), deleteService);

export default router;

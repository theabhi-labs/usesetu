import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  reorderCategories,
} from '../controllers/category.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadImage } from '../middlewares/upload.middleware';
import { Role } from '../types/auth.types';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  reorderCategoriesSchema,
} from '../validators/category.validator';

const router = Router();

// Public — no auth required, used by the public website
router.get('/public', getCategoryTree);

// Admin/Super Admin managed routes
router.use(isAuthenticated, authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN));

router.get('/tree', getCategoryTree);
router.get('/', getCategories);
router.post('/', uploadImage.single('banner'), validate(createCategorySchema), createCategory);
router.patch('/reorder', validate(reorderCategoriesSchema), reorderCategories);
router.get('/:id', validate(categoryIdParamSchema), getCategoryById);
router.put('/:id', uploadImage.single('banner'), validate(updateCategorySchema), updateCategory);
router.patch('/:id/status', validate(categoryIdParamSchema), toggleCategoryStatus);
router.delete('/:id', authorizeRoles(Role.SUPER_ADMIN), validate(categoryIdParamSchema), deleteCategory);

export default router;

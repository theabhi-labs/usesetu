import { Router } from 'express';
import {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/user.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { Role } from '../types/auth.types';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
} from '../validators/user.validator';

const router = Router();

// Only Super Admin and Admin can manage staff/users
router.use(isAuthenticated, authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN));

router.get('/', getUsers);
router.post('/', validate(createUserSchema), createUser);
router.get('/:id', validate(userIdParamSchema), getUserById);
router.put('/:id', validate(updateUserSchema), updateUser);
router.delete('/:id', validate(userIdParamSchema), deleteUser);

export default router;

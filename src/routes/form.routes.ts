import { Router } from 'express';
import {
  createForm,
  getForms,
  getFormById,
  updateForm,
  publishForm,
  cloneForm,
  deleteForm,
  getPublicFormBySlug,
  submitForm,
  getFormSubmissions,
} from '../controllers/form.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { Role } from '../types/auth.types';
import { createFormSchema, updateFormSchema, formIdParamSchema, submitFormSchema } from '../validators/form.validator';

const router = Router();

// Public — no auth required (form submission may optionally carry a Bearer
// token if the customer is logged in; isAuthenticated is intentionally NOT
// applied here so anonymous/guest submissions remain possible where allowed)
router.get('/public/:slug', getPublicFormBySlug);
router.post('/public/:slug/submit', validate(submitFormSchema), submitForm);

// Admin/Super Admin managed routes
router.use(isAuthenticated, authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN));

router.get('/', getForms);
router.post('/', validate(createFormSchema), createForm);
router.get('/:id', validate(formIdParamSchema), getFormById);
router.put('/:id', validate(updateFormSchema), updateForm);
router.patch('/:id/publish', validate(formIdParamSchema), publishForm);
router.post('/:id/clone', validate(formIdParamSchema), cloneForm);
router.get('/:id/submissions', validate(formIdParamSchema), getFormSubmissions);
router.delete('/:id', authorizeRoles(Role.SUPER_ADMIN), validate(formIdParamSchema), deleteForm);

export default router;

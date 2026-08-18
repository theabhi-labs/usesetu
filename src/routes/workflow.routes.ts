import { Router } from 'express';
import {
  createWorkflow,
  getWorkflows,
  getWorkflowTemplates,
  getWorkflowById,
  updateWorkflow,
  publishWorkflow,
  duplicateWorkflow,
  reorderStages,
  deleteWorkflow,
  getStageTransitions,
  testValidateTransition,
  getRequestHistory,
} from '../controllers/workflow.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { Role } from '../types/auth.types';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  workflowIdParamSchema,
  validateTransitionSchema,
} from '../validators/workflow.validator';

const router = Router();

// All workflow routes are internal/admin-facing — customers never call
// these directly, they only ever see the *result* (Request.currentStage)
// via the Customer Portal / Request Management module.
router.use(isAuthenticated, authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF));

router.get('/templates', getWorkflowTemplates);
router.get('/history/:requestId', getRequestHistory);

router.use(authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN));

router.get('/', getWorkflows);
router.post('/', validate(createWorkflowSchema), createWorkflow);
router.get('/:id', validate(workflowIdParamSchema), getWorkflowById);
router.put('/:id', validate(updateWorkflowSchema), updateWorkflow);
router.patch('/:id/publish', validate(workflowIdParamSchema), publishWorkflow);
router.post('/:id/duplicate', validate(workflowIdParamSchema), duplicateWorkflow);
router.patch('/:id/stages/reorder', validate(workflowIdParamSchema), reorderStages);
router.get('/:id/transitions', validate(workflowIdParamSchema), getStageTransitions);
router.post('/:id/validate-transition', validate(validateTransitionSchema), testValidateTransition);
router.delete('/:id', authorizeRoles(Role.SUPER_ADMIN), validate(workflowIdParamSchema), deleteWorkflow);

export default router;

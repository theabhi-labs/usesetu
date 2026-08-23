import { Router } from 'express';
import {
  getRequests,
  getMyRequests,
  getRequestById,
  trackRequest,
  changeStage,
  assignRequest,
  acceptRequest,
  updatePriority,
  addComment,
  getComments,
  getActivity,
  uploadDocument,
  verifyDocument,
  bulkAction,
  getRequestStats,
  uploadCompletionDocument,
  downloadCompletionDocument,
} from '../controllers/request.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadDocument as uploadDocMiddleware } from '../middlewares/upload.middleware';
import { Role } from '../types/auth.types';
import {
  requestIdParamSchema,
  requestQuerySchema,
  moveStageSchema,
  assignRequestSchema,
  addCommentSchema,
  verifyDocumentSchema,
  bulkActionSchema,
} from '../validators/request.validator';

const router = Router();

// Public — no auth, application-number tracking
router.get('/track/:applicationNumber', trackRequest);

// Every remaining route requires login
router.use(isAuthenticated);

// Customer-accessible routes (ownership enforced inside the controller)
router.get('/my', getMyRequests);
router.get('/:id', validate(requestIdParamSchema), getRequestById);
router.post('/:id/comments', validate(addCommentSchema), addComment);
router.get('/:id/comments', validate(requestIdParamSchema), getComments);
router.post('/:id/documents', uploadDocMiddleware.single('file'), uploadDocument);
router.get('/:id/completion-document/download', validate(requestIdParamSchema), downloadCompletionDocument);

// Staff/Admin/Super Admin only from here
router.use(authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF));

router.get('/', validate(requestQuerySchema), getRequests);
router.get('/stats', getRequestStats);
router.get('/:id/activity', validate(requestIdParamSchema), getActivity);
router.patch('/:id/stage', validate(moveStageSchema), changeStage);
router.post('/:id/accept', validate(requestIdParamSchema), acceptRequest);
router.post('/:id/completion-document', uploadDocMiddleware.single('file'), uploadCompletionDocument);
router.patch('/:id/priority', validate(requestIdParamSchema), updatePriority);
router.patch('/:id/documents/:docId/verify', validate(verifyDocumentSchema), verifyDocument);
router.post('/bulk', validate(bulkActionSchema), bulkAction);

// Assignment restricted to Admin/Super Admin (Staff can't reassign each other)
router.patch('/:id/assign', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN), validate(assignRequestSchema), assignRequest);

export default router;

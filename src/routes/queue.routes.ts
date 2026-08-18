import { Router } from 'express';
import {
  upsertQueueConfig,
  getQueueConfig,
  generateToken,
  getCurrentStatus,
  callNextToken,
  recallToken,
  skipToken,
  completeToken,
  cancelToken,
  listTokens,
  getQueueAnalytics,
} from '../controllers/queue.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { Role } from '../types/auth.types';
import { upsertQueueSchema, generateTokenSchema, tokenIdParamSchema, callNextSchema } from '../validators/queueAppointment.validator';

const router = Router();

// Public — live display screen (TV mode), no auth
router.get('/current', getCurrentStatus);

router.use(isAuthenticated);

// Token generation is available to any logged-in customer, and to
// staff/admin generating a walk-in token on the customer's behalf.
router.post('/token', validate(generateTokenSchema), generateToken);
router.patch('/token/:id/cancel', validate(tokenIdParamSchema), cancelToken);

router.use(authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF));

router.post('/config', validate(upsertQueueSchema), upsertQueueConfig);
router.get('/config/:service', getQueueConfig);
router.patch('/token/call', validate(callNextSchema), callNextToken);
router.patch('/token/:id/recall', validate(tokenIdParamSchema), recallToken);
router.patch('/token/:id/skip', validate(tokenIdParamSchema), skipToken);
router.patch('/token/:id/complete', validate(tokenIdParamSchema), completeToken);
router.get('/tokens', listTokens);
router.get('/analytics', getQueueAnalytics);

export default router;

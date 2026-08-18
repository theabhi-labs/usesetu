import { Router } from 'express';
import {
  createPayment,
  getPayments,
  getPaymentById,
  createRefund,
  getReceipt,
  getInvoice,
  getPaymentStats,
} from '../controllers/payment.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { Role } from '../types/auth.types';
import {
  recordPaymentSchema,
  refundSchema,
  paymentIdParamSchema,
  paymentQuerySchema,
  requestIdParamSchema,
} from '../validators/payment.validator';

const router = Router();

router.use(isAuthenticated);

// Owner-accessible reads (ownership enforced inside the controller)
router.get('/:id', validate(paymentIdParamSchema), getPaymentById);
router.get('/:id/receipt', validate(paymentIdParamSchema), getReceipt);
router.get('/request/:requestId/invoice', validate(requestIdParamSchema), getInvoice);

// Recording payments, refunds, and reports are staff-only actions
router.use(authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF));

router.post('/', validate(recordPaymentSchema), createPayment);
router.get('/', validate(paymentQuerySchema), getPayments);
router.get('/stats', getPaymentStats);
router.post('/:id/refund', validate(refundSchema), createRefund);

export default router;

import { Router } from 'express';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  createRule,
  getRules,
  updateRule,
  deleteRule,
  upsertTemplate,
  getTemplates,
} from '../controllers/notification.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { Role } from '../types/auth.types';
import {
  notificationQuerySchema,
  notificationIdParamSchema,
  updatePreferenceSchema,
  createRuleSchema,
  updateRuleSchema,
  ruleIdParamSchema,
  upsertTemplateSchema,
} from '../validators/notification.validator';

const router = Router();

router.use(isAuthenticated);

// Any logged-in user — their own notifications and preferences
router.get('/', validate(notificationQuerySchema), getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', validate(notificationIdParamSchema), markAsRead);
router.delete('/:id', validate(notificationIdParamSchema), deleteNotification);
router.get('/preferences', getPreferences);
router.put('/preferences', validate(updatePreferenceSchema), updatePreferences);

// Admin — automation rules
const adminOnly = authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN);
router.post('/rules', adminOnly, validate(createRuleSchema), createRule);
router.get('/rules', adminOnly, getRules);
router.put('/rules/:id', adminOnly, validate(updateRuleSchema), updateRule);
router.delete('/rules/:id', adminOnly, validate(ruleIdParamSchema), deleteRule);

// Admin — notification templates
router.post('/templates', adminOnly, validate(upsertTemplateSchema), upsertTemplate);
router.get('/templates', adminOnly, getTemplates);

export default router;

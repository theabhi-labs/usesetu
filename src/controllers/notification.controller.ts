import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { Notification, NotificationDeliveryStatus } from '../models/notification.model';
import { NotificationPreference } from '../models/notificationPreference.model';
import { AutomationRule } from '../models/automationRule.model';
import { NotificationTemplate } from '../models/notificationTemplate.model';

// ---------------------------------------------------------------------------
// GET /api/v1/notifications  (any logged-in user — own notifications)
// ---------------------------------------------------------------------------
export const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const filter: Record<string, unknown> = { user: req.user!.userId };
  if (status) filter.status = status;

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      notifications,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/notifications/unread-count
// ---------------------------------------------------------------------------
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await Notification.countDocuments({
    user: req.user!.userId,
    channel: 'in_app',
    status: { $ne: NotificationDeliveryStatus.READ },
  });
  res.status(200).json(new ApiResponse(200, { count }));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/notifications/:id/read
// ---------------------------------------------------------------------------
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user!.userId });
  if (!notification) throw ApiError.notFound('Notification not found');

  notification.status = NotificationDeliveryStatus.READ;
  notification.readAt = new Date();
  await notification.save();

  res.status(200).json(new ApiResponse(200, notification));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/notifications/read-all
// ---------------------------------------------------------------------------
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await Notification.updateMany(
    { user: req.user!.userId, status: { $ne: NotificationDeliveryStatus.READ } },
    { status: NotificationDeliveryStatus.READ, readAt: new Date() },
  );
  res.status(200).json(new ApiResponse(200, { updated: result.modifiedCount }));
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/notifications/:id
// ---------------------------------------------------------------------------
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const result = await Notification.deleteOne({ _id: req.params.id, user: req.user!.userId });
  if (result.deletedCount === 0) throw ApiError.notFound('Notification not found');
  res.status(200).json(new ApiResponse(200, {}, 'Notification deleted'));
});

// ---------------------------------------------------------------------------
// GET/PUT /api/v1/notifications/preferences
// ---------------------------------------------------------------------------
export const getPreferences = asyncHandler(async (req: Request, res: Response) => {
  const preference = await NotificationPreference.findOneAndUpdate(
    { user: req.user!.userId },
    { $setOnInsert: { user: req.user!.userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  res.status(200).json(new ApiResponse(200, preference));
});

export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  const preference = await NotificationPreference.findOneAndUpdate(
    { user: req.user!.userId },
    { ...req.body },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  res.status(200).json(new ApiResponse(200, preference, 'Preferences updated'));
});

// ---------------------------------------------------------------------------
// Automation rules (Admin) — /api/v1/notifications/rules
// ---------------------------------------------------------------------------
export const createRule = asyncHandler(async (req: Request, res: Response) => {
  const rule = await AutomationRule.create({ ...req.body, createdBy: req.user!.userId });
  res.status(201).json(new ApiResponse(201, rule, 'Automation rule created'));
});

export const getRules = asyncHandler(async (req: Request, res: Response) => {
  const { eventType } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (eventType) filter.eventType = eventType;

  const rules = await AutomationRule.find(filter).sort({ eventType: 1, priority: 1 }).lean();
  res.status(200).json(new ApiResponse(200, rules));
});

export const updateRule = asyncHandler(async (req: Request, res: Response) => {
  const rule = await AutomationRule.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedBy: req.user!.userId },
    { new: true },
  );
  if (!rule) throw ApiError.notFound('Automation rule not found');
  res.status(200).json(new ApiResponse(200, rule, 'Automation rule updated'));
});

export const deleteRule = asyncHandler(async (req: Request, res: Response) => {
  const result = await AutomationRule.findByIdAndDelete(req.params.id);
  if (!result) throw ApiError.notFound('Automation rule not found');
  res.status(200).json(new ApiResponse(200, {}, 'Automation rule deleted'));
});

// ---------------------------------------------------------------------------
// Notification templates (Admin) — /api/v1/notifications/templates
// ---------------------------------------------------------------------------
export const upsertTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { key, channel } = req.body;
  const template = await NotificationTemplate.findOneAndUpdate(
    { key, channel },
    { ...req.body, updatedBy: req.user!.userId, $setOnInsert: { createdBy: req.user!.userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  res.status(200).json(new ApiResponse(200, template, 'Template saved'));
});

export const getTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const templates = await NotificationTemplate.find().sort({ key: 1 }).lean();
  res.status(200).json(new ApiResponse(200, templates));
});

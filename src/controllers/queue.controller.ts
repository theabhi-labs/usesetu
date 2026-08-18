import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { Queue } from '../models/queue.model';
import { QueueToken, TokenStatus, TokenPriority } from '../models/queueToken.model';
import {
  getTodayDateString,
  generateTokenNumber,
  getPriorityWeight,
  estimateWaitMinutes,
  assertDailyLimitNotReached,
} from '../services/queueEngine.service';
import { Role } from '../types/auth.types';

// ---------------------------------------------------------------------------
// POST /api/v1/queue/config  (Admin — create or update the queue for a service)
// ---------------------------------------------------------------------------
export const upsertQueueConfig = asyncHandler(async (req: Request, res: Response) => {
  const { service } = req.body;

  const queue = await Queue.findOneAndUpdate(
    { service },
    { ...req.body, updatedBy: req.user!.userId, $setOnInsert: { createdBy: req.user!.userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  res.status(200).json(new ApiResponse(200, queue, 'Queue configuration saved'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/queue/config/:service  (Admin)
// ---------------------------------------------------------------------------
export const getQueueConfig = asyncHandler(async (req: Request, res: Response) => {
  const queue = await Queue.findOne({ service: req.params.service });
  if (!queue) throw ApiError.notFound('No queue configured for this service');
  res.status(200).json(new ApiResponse(200, queue));
});

// ---------------------------------------------------------------------------
// POST /api/v1/queue/token  (Customer/Admin — generate a new token)
// ---------------------------------------------------------------------------
export const generateToken = asyncHandler(async (req: Request, res: Response) => {
  const { service, priority, request } = req.body;

  const queue = await Queue.findOne({ service, status: 'active' });
  if (!queue) throw ApiError.badRequest('Queue is not configured or is inactive for this service');

  const dateStr = getTodayDateString();

  const issuedToday = await QueueToken.countDocuments({ queue: queue._id, tokenDate: dateStr });
  assertDailyLimitNotReached(queue.dailyLimit, issuedToday);

  const { tokenNumber } = await generateTokenNumber(String(queue._id), queue.tokenPrefix, dateStr);
  const tokenPriority: TokenPriority = queue.priorityEnabled ? priority || TokenPriority.NORMAL : TokenPriority.NORMAL;

  const waitingAhead = await QueueToken.countDocuments({
    queue: queue._id,
    tokenDate: dateStr,
    status: TokenStatus.WAITING,
    priorityWeight: { $lte: getPriorityWeight(tokenPriority) },
  });

  const token = await QueueToken.create({
    tokenNumber,
    queue: queue._id,
    service,
    customer: req.user?.userId,
    request,
    tokenDate: dateStr,
    status: TokenStatus.WAITING,
    priority: tokenPriority,
    priorityWeight: getPriorityWeight(tokenPriority),
    estimatedCallTime: new Date(Date.now() + estimateWaitMinutes(waitingAhead, queue.estimatedServiceTimeMinutes) * 60000),
  });

  res.status(201).json(new ApiResponse(201, token, 'Token generated successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/queue/current?service=xxx  (Public — live display / cache-ready)
// Redis candidate: key `queue:live:{service}`, TTL 5-10s (short — this must
// stay near-real-time for the TV display), invalidated on call/complete/skip.
// ---------------------------------------------------------------------------
export const getCurrentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { service } = req.query as { service: string };
  const queue = await Queue.findOne({ service });
  if (!queue) throw ApiError.notFound('No queue configured for this service');

  const dateStr = getTodayDateString();

  const [nowServing, waitingCount, nextUp] = await Promise.all([
    QueueToken.find({ queue: queue._id, tokenDate: dateStr, status: { $in: [TokenStatus.CALLED, TokenStatus.IN_PROGRESS] } })
      .select('tokenNumber counter status calledAt')
      .lean(),
    QueueToken.countDocuments({ queue: queue._id, tokenDate: dateStr, status: TokenStatus.WAITING }),
    QueueToken.find({ queue: queue._id, tokenDate: dateStr, status: TokenStatus.WAITING })
      .select('tokenNumber priority')
      .sort({ priorityWeight: 1, createdAt: 1 })
      .limit(5)
      .lean(),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      nowServing,
      waitingCount,
      nextUp,
      estimatedWaitMinutes: estimateWaitMinutes(waitingCount, queue.estimatedServiceTimeMinutes),
      displayEnabled: queue.displayEnabled,
    }),
  );
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/queue/token/call  (Admin/Staff — call the next waiting token)
// ---------------------------------------------------------------------------
export const callNextToken = asyncHandler(async (req: Request, res: Response) => {
  const { service, counter } = req.body;
  const queue = await Queue.findOne({ service });
  if (!queue) throw ApiError.notFound('No queue configured for this service');

  const dateStr = getTodayDateString();

  // findOneAndUpdate atomically claims the next waiting token — under
  // concurrent "call next" clicks from two counters, each gets a distinct
  // token rather than both grabbing the same one.
  const token = await QueueToken.findOneAndUpdate(
    { queue: queue._id, tokenDate: dateStr, status: TokenStatus.WAITING },
    { status: TokenStatus.CALLED, counter, calledAt: new Date() },
    { sort: { priorityWeight: 1, createdAt: 1 }, new: true },
  );

  if (!token) throw ApiError.notFound('No tokens waiting in this queue');

  res.status(200).json(new ApiResponse(200, token, 'Token called'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/queue/token/:id/recall
// ---------------------------------------------------------------------------
export const recallToken = asyncHandler(async (req: Request, res: Response) => {
  const token = await QueueToken.findById(req.params.id);
  if (!token) throw ApiError.notFound('Token not found');
  if (token.status !== TokenStatus.CALLED) throw ApiError.badRequest('Only a called token can be recalled');

  token.recallCount += 1;
  await token.save();

  res.status(200).json(new ApiResponse(200, token, 'Token recalled'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/queue/token/:id/skip
// ---------------------------------------------------------------------------
export const skipToken = asyncHandler(async (req: Request, res: Response) => {
  const token = await QueueToken.findById(req.params.id);
  if (!token) throw ApiError.notFound('Token not found');

  token.status = TokenStatus.SKIPPED;
  token.remarks = req.body.remarks;
  await token.save();

  res.status(200).json(new ApiResponse(200, token, 'Token skipped'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/queue/token/:id/complete
// ---------------------------------------------------------------------------
export const completeToken = asyncHandler(async (req: Request, res: Response) => {
  const token = await QueueToken.findById(req.params.id);
  if (!token) throw ApiError.notFound('Token not found');

  token.status = TokenStatus.COMPLETED;
  token.completedAt = new Date();
  await token.save();

  // Free up the counter for the next call.
  await Queue.updateOne(
    { _id: token.queue, 'counters.key': token.counter },
    { $unset: { 'counters.$.currentToken': '' } },
  );

  res.status(200).json(new ApiResponse(200, token, 'Token completed'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/queue/token/:id/cancel
// ---------------------------------------------------------------------------
export const cancelToken = asyncHandler(async (req: Request, res: Response) => {
  const token = await QueueToken.findById(req.params.id);
  if (!token) throw ApiError.notFound('Token not found');

  const isCustomer = req.user!.role === Role.CUSTOMER;
  if (isCustomer && String(token.customer) !== req.user!.userId) {
    throw ApiError.forbidden('You do not have access to this token');
  }

  token.status = TokenStatus.CANCELLED;
  token.cancelledAt = new Date();
  await token.save();

  res.status(200).json(new ApiResponse(200, token, 'Token cancelled'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/queue/tokens  (Admin — paginated, filter by date/status/service)
// ---------------------------------------------------------------------------
export const listTokens = asyncHandler(async (req: Request, res: Response) => {
  const { service, date, status, page = '1', limit = '50' } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = { tokenDate: date || getTodayDateString() };
  if (service) filter.service = service;
  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const [tokens, total] = await Promise.all([
    QueueToken.find(filter)
      .populate('customer', 'name mobile')
      .sort({ priorityWeight: 1, createdAt: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    QueueToken.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, { tokens, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } }),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/queue/analytics?service=xxx&date=YYYY-MM-DD  (Admin)
// ---------------------------------------------------------------------------
export const getQueueAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { service, date } = req.query as Record<string, string>;
  const dateStr = date || getTodayDateString();

  const filter: Record<string, unknown> = { tokenDate: dateStr };
  if (service) filter.service = service;

  const [result] = await QueueToken.aggregate([
    { $match: filter },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byCounter: [
          { $match: { status: TokenStatus.COMPLETED } },
          { $group: { _id: '$counter', completed: { $sum: 1 } } },
        ],
        avgWaitMinutes: [
          { $match: { status: TokenStatus.COMPLETED, calledAt: { $exists: true } } },
          {
            $project: {
              waitMinutes: { $divide: [{ $subtract: ['$calledAt', '$createdAt'] }, 60000] },
            },
          },
          { $group: { _id: null, avg: { $avg: '$waitMinutes' } } },
        ],
      },
    },
  ]);

  res.status(200).json(new ApiResponse(200, result));
});

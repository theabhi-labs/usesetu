import { Request as ExpressRequest, Response } from 'express';
import axios from 'axios';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { Request as RequestModel, RequestStatus, DocumentVerificationStatus } from '../models/request.model';
import { RequestComment, CommentVisibility } from '../models/requestComment.model';
import { RequestActivity } from '../models/requestActivity.model';
import { WorkflowHistory } from '../models/workflowHistory.model';
import { moveRequestStage } from '../services/request.service';
import { uploadToImageKit } from '../services/imagekit.service';
import { Role } from '../types/auth.types';

const ADMIN_LIST_PROJECTION =
  'applicationNumber customerName customerMobile service category status priority currentStage completionPercentage assignedTo acceptedBy acceptedAt paymentSummary createdAt';

// ---------------------------------------------------------------------------
// GET /api/v1/requests  (Admin/Staff — the main work queue)
// ---------------------------------------------------------------------------
export const getRequests = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const {
    page = '1',
    limit = '20',
    service,
    category,
    status,
    priority,
    assignedTo,
    customer,
    search,
    dateFrom,
    dateTo,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (service) filter.service = service;
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignedTo) {
    if (assignedTo === 'unassigned') {
      filter.$or = [
        { assignedTo: { $exists: false } },
        { assignedTo: null }
      ];
    } else {
      filter.assignedTo = assignedTo;
    }
  }
  if (customer) filter.customer = customer;
  if (dateFrom || dateTo) {
    filter.createdAt = {
      ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { $lte: new Date(dateTo) } : {}),
    };
  }

  // Smart Search: exact mobile match hits the { customerMobile: 1 } index
  // directly; anything else falls back to the text index across
  // applicationNumber + customerName.
  if (search) {
    if (/^[6-9]\d{9}$/.test(search)) {
      filter.customerMobile = search;
    } else {
      filter.$text = { $search: search };
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [requests, total] = await Promise.all([
    RequestModel.find(filter)
      .select(ADMIN_LIST_PROJECTION)
      .populate('service', 'name slug')
      .populate('assignedTo', 'name')
      .populate('acceptedBy', 'name')
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    RequestModel.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      requests,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/requests/my  (Customer — own request history)
// ---------------------------------------------------------------------------
export const getMyRequests = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const { page = '1', limit = '20', status } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const filter: Record<string, unknown> = { customer: req.user!.userId };
  if (status) filter.status = status;

  const [requests, total] = await Promise.all([
    RequestModel.find(filter)
      .select(ADMIN_LIST_PROJECTION)
      .populate('service', 'name slug icon')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    RequestModel.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      requests,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/requests/:id  (Admin/Staff — full detail)
// ---------------------------------------------------------------------------
export const getRequestById = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const request = await RequestModel.findById(req.params.id)
    .populate('service', 'name slug icon')
    .populate('category', 'name slug')
    .populate('customer', 'name email mobile')
    .populate('assignedTo', 'name email')
    .populate('acceptedBy', 'name email')
    .populate('workflow')
    .populate({
      path: 'formSubmission',
      populate: {
        path: 'form',
        select: 'fields'
      }
    });

  if (!request) throw ApiError.notFound('Request not found');

  const customerId = (request.customer as any)?._id
    ? (request.customer as any)._id.toString()
    : request.customer.toString();

  if (req.user!.role === Role.CUSTOMER && customerId !== req.user!.userId) {
    throw ApiError.forbidden('You do not have access to this request');
  }

  const historyQuery: Record<string, any> = { request: request._id };
  if (req.user!.role === Role.CUSTOMER) {
    historyQuery.isCustomerVisible = true;
  }

  const timelineLogs = await WorkflowHistory.find(historyQuery)
    .populate('changedBy', 'name')
    .sort({ createdAt: 1 })
    .lean();

  const responseData = {
    ...request.toJSON(),
    timeline: timelineLogs.map((log) => ({
      ...log,
      operatorName: (log.changedBy as any)?.name || 'System / Desk',
    })),
  };

  res.status(200).json(new ApiResponse(200, responseData));
});

// ---------------------------------------------------------------------------
// GET /api/v1/requests/track/:applicationNumber  (Public — no auth)
// ---------------------------------------------------------------------------
export const trackRequest = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const request = await RequestModel.findOne({ applicationNumber: req.params.applicationNumber })
    .select('applicationNumber currentStage status completionPercentage createdAt completedOn service workflow')
    .populate('service', 'name')
    .populate('workflow')
    .lean();

  if (!request) throw ApiError.notFound('No application found with this number');

  const publicHistory = await WorkflowHistory.find({
    request: request._id,
    isCustomerVisible: true,
  })
    .select('toStage remark createdAt')
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json(new ApiResponse(200, { ...request, timeline: publicHistory }));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/requests/:id/stage  (Admin/Staff — move to next stage)
// ---------------------------------------------------------------------------
export const changeStage = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const { targetStage, remark, context } = req.body;

  const updated = await moveRequestStage(
    req.params.id,
    targetStage,
    req.user!.userId,
    req.user!.role,
    {
      paymentCompleted: context?.paymentCompleted ?? false,
      documentsVerified: context?.documentsVerified ?? false,
      tokenGenerated: context?.tokenGenerated ?? false,
      appointmentBooked: context?.appointmentBooked ?? false,
    },
    remark,
  );

  res.status(200).json(new ApiResponse(200, updated, 'Stage updated successfully'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/requests/:id/assign  (Admin — assign to staff)
// ---------------------------------------------------------------------------
export const assignRequest = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw ApiError.notFound('Request not found');

  request.assignedTo = req.body.assignedTo;
  await request.save();

  await RequestActivity.create({
    request: request._id,
    action: 'ASSIGNED',
    performedBy: req.user!.userId,
    performedByRole: req.user!.role,
    description: `Assigned to staff member ${req.body.assignedTo}`,
  });

  res.status(200).json(new ApiResponse(200, request, 'Request assigned successfully'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/requests/:id/priority  (Admin)
// ---------------------------------------------------------------------------
export const updatePriority = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw ApiError.notFound('Request not found');

  request.priority = req.body.priority;
  await request.save();

  res.status(200).json(new ApiResponse(200, request, 'Priority updated'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/requests/:id/comments  (Admin/Staff/Customer)
// ---------------------------------------------------------------------------
export const addComment = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const request = await RequestModel.findById(req.params.id).select('customer');
  if (!request) throw ApiError.notFound('Request not found');

  const isCustomer = req.user!.role === Role.CUSTOMER;
  if (isCustomer && String(request.customer) !== req.user!.userId) {
    throw ApiError.forbidden('You do not have access to this request');
  }

  // Customers can only ever post customer-visible comments — never internal.
  const visibility = isCustomer ? CommentVisibility.CUSTOMER : req.body.visibility || CommentVisibility.INTERNAL;

  const comment = await RequestComment.create({
    request: request._id,
    author: req.user!.userId,
    authorRole: req.user!.role,
    visibility,
    message: req.body.message,
  });

  res.status(201).json(new ApiResponse(201, comment, 'Comment added'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/requests/:id/comments
// ---------------------------------------------------------------------------
export const getComments = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const request = await RequestModel.findById(req.params.id).select('customer');
  if (!request) throw ApiError.notFound('Request not found');

  const isCustomer = req.user!.role === Role.CUSTOMER;
  if (isCustomer && String(request.customer) !== req.user!.userId) {
    throw ApiError.forbidden('You do not have access to this request');
  }

  // Customers/public never see internal notes — filter at the query level,
  // not after fetching, so internal remarks never leave the database layer.
  const visibilityFilter = isCustomer ? { $in: [CommentVisibility.CUSTOMER, CommentVisibility.PUBLIC] } : undefined;

  const comments = await RequestComment.find({
    request: req.params.id,
    ...(visibilityFilter ? { visibility: visibilityFilter } : {}),
  })
    .populate('author', 'name role')
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json(new ApiResponse(200, comments));
});

// ---------------------------------------------------------------------------
// GET /api/v1/requests/:id/activity  (Admin/Staff only — internal audit trail)
// ---------------------------------------------------------------------------
export const getActivity = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const activity = await RequestActivity.find({ request: req.params.id })
    .populate('performedBy', 'name role')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(new ApiResponse(200, activity));
});

// ---------------------------------------------------------------------------
// POST /api/v1/requests/:id/documents  (Admin/Staff/Customer — upload, multer field: "file")
// ---------------------------------------------------------------------------
export const uploadDocument = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw ApiError.notFound('Request not found');

  const isCustomer = req.user!.role === Role.CUSTOMER;
  if (isCustomer && String(request.customer) !== req.user!.userId) {
    throw ApiError.forbidden('You do not have access to this request');
  }

  if (!req.file) throw ApiError.badRequest('No file provided');

  const uploaded = await uploadToImageKit(
    req.file.buffer,
    req.file.originalname,
    `requests/${request.applicationNumber}`,
  );

  request.documents.push({
    type: req.body.type || 'other',
    url: uploaded.url,
    fileId: uploaded.fileId,
    originalName: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
    verificationStatus: DocumentVerificationStatus.PENDING,
    uploadedBy: req.user!.userId as unknown as never,
    uploadedAt: new Date(),
  });
  await request.save();

  await RequestActivity.create({
    request: request._id,
    action: 'DOCUMENT_UPLOADED',
    performedBy: req.user!.userId,
    performedByRole: req.user!.role,
    description: `Uploaded ${req.body.type || 'document'}: ${req.file.originalname}`,
  });

  res.status(201).json(new ApiResponse(201, request.documents[request.documents.length - 1], 'Document uploaded'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/requests/:id/documents/:docId/verify  (Admin/Staff)
// ---------------------------------------------------------------------------
export const verifyDocument = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw ApiError.notFound('Request not found');

  const doc = request.documents.id(req.params.docId);
  if (!doc) throw ApiError.notFound('Document not found on this request');

  doc.verificationStatus = req.body.verificationStatus;
  doc.verificationRemark = req.body.verificationRemark;
  await request.save();

  await RequestActivity.create({
    request: request._id,
    action: 'DOCUMENT_VERIFIED',
    performedBy: req.user!.userId,
    performedByRole: req.user!.role,
    description: `${doc.type} marked as ${doc.verificationStatus}`,
  });

  res.status(200).json(new ApiResponse(200, doc, 'Document verification updated'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/requests/bulk  (Admin — bulkWrite, one round-trip)
// ---------------------------------------------------------------------------
export const bulkAction = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const { requestIds, action, assignedTo, tag } = req.body as {
    requestIds: string[];
    action: string;
    assignedTo?: string;
    tag?: string;
  };

  let update: Record<string, unknown> = {};
  switch (action) {
    case 'assign':
      if (!assignedTo) throw ApiError.badRequest('assignedTo is required for bulk assign');
      update = { assignedTo };
      break;
    case 'cancel':
      update = { status: RequestStatus.CANCELLED };
      break;
    case 'tag':
      if (!tag) throw ApiError.badRequest('tag is required for bulk tag');
      await RequestModel.updateMany({ _id: { $in: requestIds } }, { $addToSet: { tags: tag } });
      res.status(200).json(new ApiResponse(200, { updated: requestIds.length }, 'Tag applied'));
      return;
    case 'approve':
    case 'reject':
      // Approve/reject move every request through its own workflow — this
      // can't be a single bulkWrite since each request may be on a
      // different stage/workflow, so we loop (still far cheaper than N
      // separate HTTP round-trips from the client).
      for (const id of requestIds) {
        try {
          await moveRequestStage(
            id,
            req.body.targetStage,
            req.user!.userId,
            req.user!.role,
            { paymentCompleted: true, documentsVerified: true, tokenGenerated: true, appointmentBooked: true },
            req.body.remark,
          );
        } catch {
          // Skip requests where the transition isn't valid for their current
          // stage — bulk actions are best-effort across a heterogeneous set.
        }
      }
      res.status(200).json(new ApiResponse(200, { processed: requestIds.length }, 'Bulk action completed'));
      return;
    default:
      throw ApiError.badRequest('Unsupported bulk action');
  }

  const result = await RequestModel.updateMany({ _id: { $in: requestIds } }, update);
  res.status(200).json(new ApiResponse(200, { updated: result.modifiedCount }, 'Bulk action completed'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/requests/stats  (Admin — quick dashboard counts)
// ---------------------------------------------------------------------------
export const getRequestStats = asyncHandler(async (_req: ExpressRequest, res: Response) => {
  // Single aggregation instead of N separate countDocuments calls.
  const [statusCounts] = await RequestModel.aggregate([
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
        todayTotal: [
          { $match: { createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } },
          { $count: 'count' },
        ],
      },
    },
  ]);

  res.status(200).json(new ApiResponse(200, statusCounts));
});

// ---------------------------------------------------------------------------
// POST /api/v1/requests/:id/accept  (Staff/Admin — accept available request)
// ---------------------------------------------------------------------------
export const acceptRequest = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const staffId = req.user!.userId;

  // Double-accept protection: atomic check that assignedTo is null/empty
  const request = await RequestModel.findOneAndUpdate(
    {
      _id: req.params.id,
      $or: [
        { assignedTo: { $exists: false } },
        { assignedTo: null }
      ]
    },
    {
      $set: {
        assignedTo: staffId,
        acceptedBy: staffId,
        acceptedAt: new Date()
      }
    },
    { new: true }
  ).populate('assignedTo', 'name');

  if (!request) {
    const exists = await RequestModel.findById(req.params.id);
    if (!exists) {
      throw ApiError.notFound('Request not found');
    }
    throw ApiError.conflict('This request has already been accepted or assigned');
  }

  await RequestActivity.create({
    request: request._id,
    action: 'ASSIGNED',
    performedBy: staffId,
    performedByRole: req.user!.role,
    description: `Request accepted by staff member (ID: ${staffId})`,
  });

  res.status(200).json(new ApiResponse(200, request, 'Request accepted successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/requests/:id/completion-document  (Admin/Staff — upload, multer field: "file")
// ---------------------------------------------------------------------------
export const uploadCompletionDocument = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw ApiError.notFound('Request not found');

  if (!req.file) throw ApiError.badRequest('No file provided');

  const downloadPolicy = req.body.downloadPolicy === 'once' ? 'once' : 'permanent';

  const uploaded = await uploadToImageKit(
    req.file.buffer,
    req.file.originalname,
    `requests/${request.applicationNumber}/receiving`,
  );

  request.completionDocument = {
    url: uploaded.url,
    fileId: uploaded.fileId,
    originalName: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
    uploadedBy: req.user!.userId as any,
    uploadedAt: new Date(),
    downloadPolicy,
    downloadCount: 0,
    downloads: [],
  };
  await request.save();

  await RequestActivity.create({
    request: request._id,
    action: 'RECEIVING_UPLOADED',
    performedBy: req.user!.userId,
    performedByRole: req.user!.role,
    description: `Uploaded completion document: ${req.file.originalname} (Policy: ${downloadPolicy})`,
  });

  res.status(200).json(new ApiResponse(200, request, 'Completion document uploaded successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/requests/:id/completion-document/download  (Customer/Staff/Admin)
// ---------------------------------------------------------------------------
export const downloadCompletionDocument = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw ApiError.notFound('Request not found');

  const isCustomer = req.user!.role === Role.CUSTOMER;
  if (isCustomer && String(request.customer) !== req.user!.userId) {
    throw ApiError.forbidden('You do not have access to this request');
  }

  const doc = request.completionDocument;
  if (!doc || !doc.url) {
    throw ApiError.notFound('Completion document has not been uploaded for this request');
  }

  // If downloadPolicy is "once", check if it has already been downloaded
  if (doc.downloadPolicy === 'once' && doc.downloadCount > 0) {
    throw ApiError.badRequest('This receiving document was configured for one-time download and has already been downloaded.');
  }

  // Increment download count and audit log
  doc.downloadCount += 1;
  doc.downloads.push({
    downloadedBy: req.user!.userId as any,
    downloadedAt: new Date(),
    ipAddress: req.ip,
  });
  await request.save();

  // Log in RequestActivity
  await RequestActivity.create({
    request: request._id,
    action: 'RECEIVING_DOWNLOADED',
    performedBy: req.user!.userId,
    performedByRole: req.user!.role,
    description: `Downloaded completion document: ${doc.originalName} (Download #${doc.downloadCount})`,
  });

  // Stream the file from ImageKit with attachment headers to force download
  try {
    const responseStream = await axios.get(doc.url, { responseType: 'stream' });
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
    responseStream.data.pipe(res);
  } catch (error) {
    // Fallback redirect if proxy streaming fails
    res.redirect(doc.url);
  }
});

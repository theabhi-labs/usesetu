import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { Workflow, WorkflowStatus } from '../models/workflow.model';
import { WorkflowHistory } from '../models/workflowHistory.model';
import { Service } from '../models/service.model';
import { AuditLog } from '../models/auditLog.model';
import { validateTransition, getAvailableTransitions } from '../services/workflowEngine.service';

const logAudit = async (userId: string, action: string, req: Request, description?: string) => {
  await AuditLog.create({
    user: userId,
    action,
    module: 'WORKFLOW',
    description,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
};

// ---------------------------------------------------------------------------
// POST /api/v1/workflows  (Admin)
// ---------------------------------------------------------------------------
export const createWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const { service, isDefault } = req.body;

  const serviceExists = await Service.exists({ _id: service });
  if (!serviceExists) throw ApiError.badRequest('Service does not exist');

  // Only one default workflow per service — unset any existing default
  // before creating this one, in the same spirit as "publish archives the
  // previous version" in the Form Builder module.
  if (isDefault) {
    await Workflow.updateMany({ service, isDefault: true }, { isDefault: false });
  }

  const workflow = await Workflow.create({
    ...req.body,
    status: WorkflowStatus.DRAFT,
    createdBy: req.user!.userId,
  });

  await logAudit(req.user!.userId, 'WORKFLOW_CREATED', req, `Created workflow: ${workflow.name}`);

  res.status(201).json(new ApiResponse(201, workflow, 'Workflow created successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/workflows  (Admin — filter by service/status, paginated)
// ---------------------------------------------------------------------------
export const getWorkflows = asyncHandler(async (req: Request, res: Response) => {
  const { service, status, page = '1', limit = '20' } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (service) filter.service = service;
  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [workflows, total] = await Promise.all([
    Workflow.find(filter)
      .select('name description service status isDefault version createdAt')
      .populate('service', 'name slug')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Workflow.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      workflows,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/workflows/templates  (Admin — pre-built starting points)
// ---------------------------------------------------------------------------
// Static, not DB-backed — these are just a convenience payload the frontend
// pre-fills into the workflow builder; the admin still saves it as a real,
// fully editable Workflow document via createWorkflow.
export const getWorkflowTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const templates = [
    {
      key: 'standard-certificate',
      name: 'Standard Certificate Workflow',
      description: 'Applied → Verification → Payment → Processing → Approved → Completed',
      stages: [
        { key: 'applied', title: 'Applied', order: 0, statusType: 'initial', completionPercentage: 10 },
        { key: 'verification', title: 'Document Verification', order: 1, statusType: 'intermediate', completionPercentage: 30 },
        { key: 'payment_pending', title: 'Payment Pending', order: 2, statusType: 'intermediate', completionPercentage: 50 },
        { key: 'processing', title: 'Processing', order: 3, statusType: 'intermediate', completionPercentage: 70 },
        { key: 'approved', title: 'Approved', order: 4, statusType: 'intermediate', completionPercentage: 90 },
        { key: 'completed', title: 'Completed', order: 5, statusType: 'final', completionPercentage: 100, isFinal: true },
      ],
    },
    {
      key: 'queue-based',
      name: 'Queue / Token Based Workflow',
      description: 'Token Generated → Waiting → Now Serving → Payment → Finished',
      stages: [
        { key: 'token_generated', title: 'Token Generated', order: 0, statusType: 'initial', completionPercentage: 20 },
        { key: 'waiting', title: 'Waiting', order: 1, statusType: 'intermediate', completionPercentage: 40 },
        { key: 'now_serving', title: 'Now Serving', order: 2, statusType: 'intermediate', completionPercentage: 70 },
        { key: 'payment_completed', title: 'Payment Completed', order: 3, statusType: 'intermediate', completionPercentage: 90 },
        { key: 'finished', title: 'Finished', order: 4, statusType: 'final', completionPercentage: 100, isFinal: true },
      ],
    },
  ];

  res.status(200).json(new ApiResponse(200, templates));
});

// ---------------------------------------------------------------------------
// GET /api/v1/workflows/:id  (Admin)
// ---------------------------------------------------------------------------
export const getWorkflowById = asyncHandler(async (req: Request, res: Response) => {
  const workflow = await Workflow.findById(req.params.id).populate('service', 'name slug');
  if (!workflow) throw ApiError.notFound('Workflow not found');
  res.status(200).json(new ApiResponse(200, workflow));
});

// ---------------------------------------------------------------------------
// PUT /api/v1/workflows/:id  (Admin — in-place edit + version bump)
// ---------------------------------------------------------------------------
export const updateWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const workflow = await Workflow.findById(req.params.id);
  if (!workflow) throw ApiError.notFound('Workflow not found');

  if (req.body.isDefault) {
    await Workflow.updateMany(
      { service: workflow.service, _id: { $ne: workflow._id }, isDefault: true },
      { isDefault: false },
    );
  }

  Object.assign(workflow, req.body);
  workflow.version += 1;
  workflow.updatedBy = req.user!.userId as unknown as typeof workflow.updatedBy;
  await workflow.save();

  await logAudit(req.user!.userId, 'WORKFLOW_UPDATED', req, `Updated workflow: ${workflow.name} (v${workflow.version})`);

  res.status(200).json(new ApiResponse(200, workflow, 'Workflow updated successfully'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/workflows/:id/publish  (Admin)
// ---------------------------------------------------------------------------
export const publishWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const workflow = await Workflow.findById(req.params.id);
  if (!workflow) throw ApiError.notFound('Workflow not found');
  if (workflow.stages.length === 0) throw ApiError.badRequest('Cannot publish a workflow with no stages');

  workflow.status = WorkflowStatus.PUBLISHED;
  await workflow.save();

  await logAudit(req.user!.userId, 'WORKFLOW_PUBLISHED', req, `Published ${workflow.name}`);

  res.status(200).json(new ApiResponse(200, workflow, 'Workflow published successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/workflows/:id/duplicate  (Admin)
// ---------------------------------------------------------------------------
export const duplicateWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const source = await Workflow.findById(req.params.id);
  if (!source) throw ApiError.notFound('Workflow not found');

  const duplicate = await Workflow.create({
    ...source.toObject(),
    _id: undefined,
    name: `${source.name} (Copy)`,
    status: WorkflowStatus.DRAFT,
    isDefault: false,
    version: 1,
    createdBy: req.user!.userId,
    updatedBy: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  });

  await logAudit(req.user!.userId, 'WORKFLOW_DUPLICATED', req, `Duplicated ${source.name}`);

  res.status(201).json(new ApiResponse(201, duplicate, 'Workflow duplicated successfully'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/workflows/:id/stages/reorder  (Admin)
// ---------------------------------------------------------------------------
export const reorderStages = asyncHandler(async (req: Request, res: Response) => {
  const { items } = req.body as { items: { key: string; order: number }[] };
  const workflow = await Workflow.findById(req.params.id);
  if (!workflow) throw ApiError.notFound('Workflow not found');

  const orderMap = new Map(items.map((i) => [i.key, i.order]));
  workflow.stages.forEach((stage) => {
    if (orderMap.has(stage.key)) stage.order = orderMap.get(stage.key)!;
  });
  workflow.stages.sort((a, b) => a.order - b.order);

  await workflow.save();
  await logAudit(req.user!.userId, 'WORKFLOW_STAGES_REORDERED', req, `Reordered stages for ${workflow.name}`);

  res.status(200).json(new ApiResponse(200, workflow, 'Stages reordered successfully'));
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/workflows/:id  (Super Admin — soft delete)
// ---------------------------------------------------------------------------
export const deleteWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const workflow = await Workflow.findById(req.params.id);
  if (!workflow) throw ApiError.notFound('Workflow not found');

  if (workflow.isDefault) {
    throw ApiError.badRequest('Cannot delete the default workflow for a service. Set another workflow as default first.');
  }

  workflow.deletedAt = new Date();
  workflow.status = WorkflowStatus.ARCHIVED;
  await workflow.save();

  await logAudit(req.user!.userId, 'WORKFLOW_DELETED', req, `Soft-deleted workflow: ${workflow.name}`);

  res.status(200).json(new ApiResponse(200, {}, 'Workflow deleted successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/workflows/:id/transitions?fromStage=applied  (Admin)
// Returns the action buttons available to the current user's role.
// ---------------------------------------------------------------------------
export const getStageTransitions = asyncHandler(async (req: Request, res: Response) => {
  const workflow = await Workflow.findById(req.params.id).lean();
  if (!workflow) throw ApiError.notFound('Workflow not found');

  const fromStage = req.query.fromStage as string;
  if (!fromStage) throw ApiError.badRequest('fromStage query parameter is required');

  const available = getAvailableTransitions(workflow, fromStage, req.user!.role);
  res.status(200).json(new ApiResponse(200, available));
});

// ---------------------------------------------------------------------------
// POST /api/v1/workflows/:id/validate-transition  (Admin — dry-run check)
// Useful for the frontend to grey out an action button before the actual
// Request-stage-move call (once the Request Management module ships).
// ---------------------------------------------------------------------------
export const testValidateTransition = asyncHandler(async (req: Request, res: Response) => {
  const workflow = await Workflow.findById(req.params.id);
  if (!workflow) throw ApiError.notFound('Workflow not found');

  const { currentStage, targetStage, context, remark } = req.body;

  const result = validateTransition(
    workflow,
    currentStage,
    targetStage,
    req.user!.role,
    {
      paymentCompleted: context?.paymentCompleted ?? false,
      documentsVerified: context?.documentsVerified ?? false,
      tokenGenerated: context?.tokenGenerated ?? false,
      appointmentBooked: context?.appointmentBooked ?? false,
    },
    remark,
  );

  res.status(200).json(new ApiResponse(200, result, 'Transition is valid'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/workflows/history/:requestId  (Admin/Customer — request timeline)
// Ready for the Request Management module to link to; works standalone
// today for manually-inserted history rows during testing.
// ---------------------------------------------------------------------------
export const getRequestHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await WorkflowHistory.find({ request: req.params.requestId })
    .populate('changedBy', 'name role')
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json(new ApiResponse(200, history));
});

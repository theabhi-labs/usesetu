import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { Form, FormStatus } from '../models/form.model';
import { FormSubmission, SubmissionStatus } from '../models/formSubmission.model';
import { Service } from '../models/service.model';
import { AuditLog } from '../models/auditLog.model';
import { slugify } from '../utils/generateCode';
import { validateSubmission, sanitizeSubmissionValues } from '../services/formValidation.service';
import { createRequestFromSubmission } from '../services/request.service';
import { logger } from '../config/logger';

const logAudit = async (userId: string, action: string, req: Request, description?: string) => {
  await AuditLog.create({
    user: userId,
    action,
    module: 'FORM',
    description,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
};

const generateUniqueSlug = async (title: string): Promise<string> => {
  const base = slugify(title);
  let slug = base;
  let counter = 2;
  while (await Form.exists({ slug, status: { $ne: FormStatus.ARCHIVED } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
};

// ---------------------------------------------------------------------------
// POST /api/v1/forms  (Admin — creates a new form, starts at version 1/draft)
// ---------------------------------------------------------------------------
export const createForm = asyncHandler(async (req: Request, res: Response) => {
  const { service, title } = req.body;

  const serviceExists = await Service.exists({ _id: service });
  if (!serviceExists) throw ApiError.badRequest('Service does not exist');

  const slug = await generateUniqueSlug(title);
  const formGroupId = new mongoose.Types.ObjectId();

  const form = await Form.create({
    ...req.body,
    slug,
    formGroupId,
    version: 1,
    status: FormStatus.DRAFT,
    createdBy: req.user!.userId,
  });

  await logAudit(req.user!.userId, 'FORM_CREATED', req, `Created form: ${title}`);

  res.status(201).json(new ApiResponse(201, form, 'Form created successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/forms  (Admin — list, filter by service, latest version per group)
// ---------------------------------------------------------------------------
export const getForms = asyncHandler(async (req: Request, res: Response) => {
  const { service, status, page = '1', limit = '20' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const match: Record<string, unknown> = {};
  if (service) match.service = new mongoose.Types.ObjectId(service);
  if (status) match.status = status;

  // Aggregation: group by formGroupId, keep only the latest version per
  // group, so the admin list shows one row per "logical form" rather than
  // every historical version cluttering the table.
  const [result] = await Form.aggregate([
    { $match: { ...match, deletedAt: null } },
    { $sort: { version: -1 } },
    {
      $group: {
        _id: '$formGroupId',
        doc: { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        data: [
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum },
          {
            $project: {
              title: 1,
              slug: 1,
              service: 1,
              version: 1,
              status: 1,
              formGroupId: 1,
              createdAt: 1,
              fieldCount: { $size: '$fields' },
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    },
  ]);

  const total = result?.totalCount?.[0]?.count || 0;

  res.status(200).json(
    new ApiResponse(200, {
      forms: result?.data || [],
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/forms/:id  (Admin — full definition including all fields)
// ---------------------------------------------------------------------------
export const getFormById = asyncHandler(async (req: Request, res: Response) => {
  const form = await Form.findById(req.params.id);
  if (!form) throw ApiError.notFound('Form not found');
  res.status(200).json(new ApiResponse(200, form));
});

// ---------------------------------------------------------------------------
// PUT /api/v1/forms/:id  (Admin — update)
// Rule: a DRAFT form is edited in place. A PUBLISHED form is never mutated —
// editing it creates a new draft version (version + 1) so historical
// submissions keep referencing the exact field definitions they saw.
// ---------------------------------------------------------------------------
export const updateForm = asyncHandler(async (req: Request, res: Response) => {
  const existing = await Form.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Form not found');

  if (existing.status === FormStatus.DRAFT) {
    Object.assign(existing, req.body);
    existing.updatedBy = req.user!.userId as unknown as typeof existing.updatedBy;
    await existing.save();

    await logAudit(req.user!.userId, 'FORM_UPDATED', req, `Updated draft form: ${existing.title}`);
    res.status(200).json(new ApiResponse(200, existing, 'Form updated successfully'));
    return;
  }

  // Published (or archived) — fork a new draft version instead of mutating.
  const latestVersion = await Form.findOne({ formGroupId: existing.formGroupId }).sort({ version: -1 });
  const nextVersion = (latestVersion?.version || existing.version) + 1;

  const newVersion = await Form.create({
    ...existing.toObject(),
    _id: undefined,
    ...req.body,
    version: nextVersion,
    status: FormStatus.DRAFT,
    createdBy: req.user!.userId,
    updatedBy: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  });

  await logAudit(
    req.user!.userId,
    'FORM_NEW_VERSION_CREATED',
    req,
    `Created v${nextVersion} of form: ${existing.title}`,
  );

  res
    .status(201)
    .json(new ApiResponse(201, newVersion, `Published form was not mutated — created version ${nextVersion} as a new draft`));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/forms/:id/publish  (Admin)
// ---------------------------------------------------------------------------
export const publishForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await Form.findById(req.params.id);
  if (!form) throw ApiError.notFound('Form not found');
  if (form.fields.length === 0) throw ApiError.badRequest('Cannot publish a form with no fields');

  // Archive any previously published version in the same group — only one
  // published version per form group should be "live" at a time.
  await Form.updateMany(
    { formGroupId: form.formGroupId, status: FormStatus.PUBLISHED },
    { status: FormStatus.ARCHIVED },
  );

  form.status = FormStatus.PUBLISHED;
  await form.save();

  await logAudit(req.user!.userId, 'FORM_PUBLISHED', req, `Published ${form.title} v${form.version}`);

  res.status(200).json(new ApiResponse(200, form, 'Form published successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/forms/:id/clone  (Admin)
// ---------------------------------------------------------------------------
export const cloneForm = asyncHandler(async (req: Request, res: Response) => {
  const source = await Form.findById(req.params.id);
  if (!source) throw ApiError.notFound('Form not found');

  const title = `${source.title} (Copy)`;
  const slug = await generateUniqueSlug(title);

  const cloned = await Form.create({
    ...source.toObject(),
    _id: undefined,
    title,
    slug,
    formGroupId: new mongoose.Types.ObjectId(),
    version: 1,
    status: FormStatus.DRAFT,
    createdBy: req.user!.userId,
    updatedBy: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  });

  await logAudit(req.user!.userId, 'FORM_CLONED', req, `Cloned ${source.title} -> ${title}`);

  res.status(201).json(new ApiResponse(201, cloned, 'Form cloned successfully'));
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/forms/:id  (Super Admin — soft delete)
// ---------------------------------------------------------------------------
export const deleteForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await Form.findById(req.params.id);
  if (!form) throw ApiError.notFound('Form not found');

  form.deletedAt = new Date();
  form.status = FormStatus.ARCHIVED;
  await form.save();

  await logAudit(req.user!.userId, 'FORM_DELETED', req, `Soft-deleted form: ${form.title}`);

  res.status(200).json(new ApiResponse(200, {}, 'Form deleted successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/forms/public/:slug  (Public — the live published version)
// ---------------------------------------------------------------------------
export const getPublicFormBySlug = asyncHandler(async (req: Request, res: Response) => {
  // Index-backed: { slug: 1, status: 1, version: -1 }
  const form = await Form.findOne({ slug: req.params.slug, status: FormStatus.PUBLISHED })
    .sort({ version: -1 })
    .lean();

  if (!form) throw ApiError.notFound('Form not found or not published');

  // Strip fields the customer shouldn't see the internals of (e.g. calculated
  // formulas are server-only business logic).
  const safeFields = form.fields.map(({ calculated: _calculated, ...rest }) => rest);

  res.status(200).json(new ApiResponse(200, { ...form, fields: safeFields }));
});

// ---------------------------------------------------------------------------
// POST /api/v1/forms/public/:slug/submit  (Public — customer submission)
// ---------------------------------------------------------------------------
export const submitForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await Form.findOne({ slug: req.params.slug, status: FormStatus.PUBLISHED }).sort({ version: -1 });
  if (!form) throw ApiError.notFound('Form not found or not published');

  const rawValues = req.body.values as Record<string, unknown>;

  const errors = validateSubmission(form, rawValues);
  if (errors.length > 0) {
    throw ApiError.badRequest('Validation failed', errors);
  }

  const cleanValues = sanitizeSubmissionValues(form, rawValues);

  // Enforce field-level `unique` constraints (e.g. one submission per Aadhaar per service)
  const uniqueFields = form.fields.filter((f) => f.unique);
  for (const field of uniqueFields) {
    const value = cleanValues[field.fieldKey];
    if (value === undefined) continue;
    const duplicate = await FormSubmission.exists({
      service: form.service,
      [`values.${field.fieldKey}`]: value,
    });
    if (duplicate) {
      throw ApiError.conflict(`${field.label} has already been used for a submission`);
    }
  }

  if (!form.settings.allowMultipleSubmissionsPerCustomer && req.user) {
    const existing = await FormSubmission.exists({ formGroupId: form.formGroupId, customer: req.user.userId });
    if (existing) throw ApiError.conflict('You have already submitted this form');
  }

  const submission = await FormSubmission.create({
    form: form._id,
    formGroupId: form.formGroupId,
    service: form.service,
    customer: req.user?.userId,
    values: cleanValues,
    status: SubmissionStatus.SUBMITTED,
    submittedIp: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Create the Request immediately so the customer gets an application
  // number in the same response. If the service has no published default
  // workflow configured, the submission still succeeds (so the customer's
  // data isn't lost) but the request-creation error is logged for an admin
  // to fix the workflow configuration; the submission stays request-less
  // until retried.
  let applicationNumber: string | undefined;
  try {
    const request = await createRequestFromSubmission(String(submission._id));
    applicationNumber = request?.applicationNumber;
  } catch (error) {
    logger.error(
      `Request auto-creation failed for submission ${submission._id}: ${(error as Error).message}`,
    );
  }

  res.status(201).json(
    new ApiResponse(
      201,
      { submissionId: submission._id, applicationNumber },
      form.settings.successMessage,
    ),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/forms/:id/submissions  (Admin — paginated)
// ---------------------------------------------------------------------------
export const getFormSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const form = await Form.findById(req.params.id).select('formGroupId').lean();
  if (!form) throw ApiError.notFound('Form not found');

  // Filter by formGroupId (not the specific version id) so submissions
  // across every version of this form show up in one list.
  const filter: Record<string, unknown> = { formGroupId: form.formGroupId };
  if (status) filter.status = status;

  const [submissions, total] = await Promise.all([
    FormSubmission.find(filter)
      .populate('customer', 'name email mobile')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    FormSubmission.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      submissions,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }),
  );
});

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { Service } from '../models/service.model';
import { Category } from '../models/category.model';
import { AuditLog } from '../models/auditLog.model';
import { slugify } from '../utils/generateCode';
import { uploadToImageKit, deleteFromImageKit } from '../services/imagekit.service';
import { toPublicServiceDTO } from '../dto/service.dto';

const logAudit = async (userId: string, action: string, req: Request, description?: string) => {
  await AuditLog.create({
    user: userId,
    action,
    module: 'SERVICE',
    description,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
};

const generateUniqueSlug = async (name: string, excludeId?: string): Promise<string> => {
  const base = slugify(name);
  let slug = base;
  let counter = 2;
  while (await Service.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
};

// Fields returned by admin list/detail views. Keeping an explicit projection
// (rather than fetching the whole document) cuts payload size and avoids
// pulling large fields (faqs, instructions) into list views that don't need them.
const ADMIN_LIST_PROJECTION =
  'name slug category icon image serviceMode serviceFee govtFee cscFee status isFeatured homepageVisibility sortOrder createdAt';

// ---------------------------------------------------------------------------
// POST /api/v1/services  (Admin/Super Admin)
// ---------------------------------------------------------------------------
export const createService = asyncHandler(async (req: Request, res: Response) => {
  const { category, name } = req.body;

  // .lean() here: we only need to confirm existence, not hydrate a full
  // Mongoose document — cheaper on memory and CPU.
  const categoryExists = await Category.exists({ _id: category });
  if (!categoryExists) throw ApiError.badRequest('Category does not exist');

  const slug = await generateUniqueSlug(name);

  let image;
  if (req.file) {
    const uploaded = await uploadToImageKit(req.file.buffer, req.file.originalname, 'services');
    image = { url: uploaded.url, fileId: uploaded.fileId };
  }

  const service = await Service.create({
    ...req.body,
    slug,
    image,
    createdBy: req.user!.userId,
  });

  await logAudit(req.user!.userId, 'SERVICE_CREATED', req, `Created service: ${name}`);

  res.status(201).json(new ApiResponse(201, service, 'Service created successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/services  (Admin — paginated, filtered, sorted, searched)
// ---------------------------------------------------------------------------
export const getServices = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '20',
    category,
    status,
    serviceMode,
    isFeatured,
    search,
    sortBy = 'sortOrder',
    sortOrder = 'asc',
  } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (serviceMode) filter.serviceMode = serviceMode;
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';
  if (search) filter.$text = { $search: search };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // .lean() skips Mongoose document hydration (getters/setters/change
  // tracking) — for read-only list responses this is a significant win
  // at scale (lower CPU + memory per request).
  const [services, total] = await Promise.all([
    Service.find(filter)
      .select(ADMIN_LIST_PROJECTION)
      .populate('category', 'name slug') // targeted populate — only 2 fields, not the whole category doc
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Service.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      services,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/services/public  (Public website — cache-friendly)
// ---------------------------------------------------------------------------
// This response is a strong candidate for a Redis cache (see README):
// key `services:public:{category?}:{page}`, TTL ~5 min, invalidated on any
// service create/update/delete for that category.
export const getPublicServices = asyncHandler(async (req: Request, res: Response) => {
  const { category, page = '1', limit = '20' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const filter: Record<string, unknown> = { status: 'active', homepageVisibility: true };
  if (category) filter.category = category;

  const services = await Service.find(filter)
    .sort({ sortOrder: 1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  res.status(200).json(new ApiResponse(200, services.map(toPublicServiceDTO)));
});

// ---------------------------------------------------------------------------
// GET /api/v1/services/featured  (Public — homepage carousel)
// ---------------------------------------------------------------------------
export const getFeaturedServices = asyncHandler(async (_req: Request, res: Response) => {
  // Uses the { isFeatured: 1, status: 1 } compound index — no collection scan.
  const services = await Service.find({ isFeatured: true, status: 'active' })
    .sort({ sortOrder: 1 })
    .limit(12)
    .lean();

  res.status(200).json(new ApiResponse(200, services.map(toPublicServiceDTO)));
});

// ---------------------------------------------------------------------------
// GET /api/v1/services/public/:slug  (Public — service detail page)
// ---------------------------------------------------------------------------
export const getPublicServiceBySlug = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findOne({ slug: req.params.slug, status: 'active' }).lean();
  if (!service) throw ApiError.notFound('Service not found');
  res.status(200).json(new ApiResponse(200, toPublicServiceDTO(service)));
});

// ---------------------------------------------------------------------------
// GET /api/v1/services/:id  (Admin)
// ---------------------------------------------------------------------------
export const getServiceById = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findById(req.params.id).populate('category', 'name slug');
  if (!service) throw ApiError.notFound('Service not found');
  res.status(200).json(new ApiResponse(200, service));
});

// ---------------------------------------------------------------------------
// PUT /api/v1/services/:id  (Admin/Super Admin)
// ---------------------------------------------------------------------------
export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound('Service not found');

  const { category, name } = req.body;

  if (category) {
    const categoryExists = await Category.exists({ _id: category });
    if (!categoryExists) throw ApiError.badRequest('Category does not exist');
  }

  if (name && name !== service.name) {
    service.slug = await generateUniqueSlug(name, req.params.id);
  }

  if (req.file) {
    if (service.image?.fileId) await deleteFromImageKit(service.image.fileId);
    const uploaded = await uploadToImageKit(req.file.buffer, req.file.originalname, 'services');
    service.image = { url: uploaded.url, fileId: uploaded.fileId };
  }

  Object.assign(service, req.body);
  service.updatedBy = req.user!.userId as unknown as typeof service.updatedBy;
  await service.save();

  await logAudit(req.user!.userId, 'SERVICE_UPDATED', req, `Updated service: ${service.name}`);

  res.status(200).json(new ApiResponse(200, service, 'Service updated successfully'));
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/services/:id  (Super Admin — soft delete)
// ---------------------------------------------------------------------------
export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound('Service not found');

  // TODO: once Request model exists, block deletion (or cascade-archive)
  // if any Request references this service.

  // Soft delete: sets deletedAt instead of removing the document, so
  // historical Requests that reference this service keep working and
  // audit/reporting queries stay accurate.
  service.deletedAt = new Date();
  service.status = 'inactive';
  await service.save();

  await logAudit(req.user!.userId, 'SERVICE_DELETED', req, `Soft-deleted service: ${service.name}`);

  res.status(200).json(new ApiResponse(200, {}, 'Service deleted successfully'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/services/:id/status
// ---------------------------------------------------------------------------
export const toggleServiceStatus = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound('Service not found');

  service.status = service.status === 'active' ? 'inactive' : 'active';
  await service.save();

  await logAudit(req.user!.userId, 'SERVICE_STATUS_TOGGLED', req, `${service.name} -> ${service.status}`);

  res.status(200).json(new ApiResponse(200, service, 'Service status updated'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/services/:id/featured
// ---------------------------------------------------------------------------
export const toggleServiceFeatured = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound('Service not found');

  service.isFeatured = !service.isFeatured;
  await service.save();

  await logAudit(req.user!.userId, 'SERVICE_FEATURED_TOGGLED', req, `${service.name} -> ${service.isFeatured}`);

  res.status(200).json(new ApiResponse(200, service, 'Service featured status updated'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/services/reorder
// ---------------------------------------------------------------------------
export const reorderServices = asyncHandler(async (req: Request, res: Response) => {
  const { items } = req.body as { items: { id: string; sortOrder: number }[] };

  // bulkWrite: a single round-trip to MongoDB instead of N sequential
  // findByIdAndUpdate calls — critical once a category has 50+ services.
  await Service.bulkWrite(
    items.map((item) => ({
      updateOne: { filter: { _id: item.id }, update: { sortOrder: item.sortOrder } },
    })),
  );

  await logAudit(req.user!.userId, 'SERVICE_REORDERED', req, `Reordered ${items.length} services`);

  res.status(200).json(new ApiResponse(200, {}, 'Services reordered successfully'));
});

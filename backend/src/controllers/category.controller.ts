import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { Category } from '../models/category.model';
import { AuditLog } from '../models/auditLog.model';
import { slugify } from '../utils/generateCode';
import { uploadToImageKit, deleteFromImageKit } from '../services/imagekit.service';

const logAudit = async (userId: string, action: string, req: Request, description?: string) => {
  await AuditLog.create({
    user: userId,
    action,
    module: 'CATEGORY',
    description,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
};

/**
 * Generates a unique slug, appending -2, -3, etc. on collision.
 */
const generateUniqueSlug = async (name: string, excludeId?: string): Promise<string> => {
  const base = slugify(name);
  let slug = base;
  let counter = 2;

  while (await Category.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
};

// ---------------------------------------------------------------------------
// POST /api/v1/categories  (Admin/Super Admin)
// ---------------------------------------------------------------------------
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, parent, themeColor, description, seo, sortOrder, isActive, showOnHomepage, isFeatured } = req.body;

  if (parent) {
    const parentExists = await Category.findById(parent);
    if (!parentExists) throw ApiError.badRequest('Parent category does not exist');
  }

  const slug = await generateUniqueSlug(name);

  let banner;
  if (req.file) {
    const uploaded = await uploadToImageKit(req.file.buffer, req.file.originalname, 'categories');
    banner = { url: uploaded.url, fileId: uploaded.fileId };
  }

  const category = await Category.create({
    name,
    slug,
    parent: parent || null,
    banner,
    themeColor,
    description,
    seo,
    sortOrder,
    isActive,
    showOnHomepage,
    isFeatured,
    createdBy: req.user!.userId,
  });

  await logAudit(req.user!.userId, 'CATEGORY_CREATED', req, `Created category: ${name}`);

  res.status(201).json(new ApiResponse(201, category, 'Category created successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/categories  (Admin — full list with filters)
// ---------------------------------------------------------------------------
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const { parent, isActive, search, page = '1', limit = '20' } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (parent !== undefined) filter.parent = parent === 'null' ? null : parent;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) filter.$text = { $search: search };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [categories, total] = await Promise.all([
    Category.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Category.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      categories,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/categories/tree  (Admin — full nested tree)
// GET /api/v1/categories/public  (Public — active only, nested tree)
// ---------------------------------------------------------------------------
interface CategoryTreeNode {
  _id: unknown;
  children: CategoryTreeNode[];
  [key: string]: unknown;
}

const buildTree = (categories: CategoryTreeNode[]): CategoryTreeNode[] => {
  const map = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  categories.forEach((cat) => {
    map.set(String(cat._id), { ...cat, children: [] });
  });

  categories.forEach((cat) => {
    const node = map.get(String(cat._id))!;
    const parentId = cat.parent ? String(cat.parent) : null;
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

export const getCategoryTree = asyncHandler(async (req: Request, res: Response) => {
  const isPublicRoute = req.path.includes('/public');
  const filter = isPublicRoute ? { isActive: true } : {};

  const categories = await Category.find(filter).sort({ sortOrder: 1 }).lean();
  const tree = buildTree(categories as unknown as CategoryTreeNode[]);

  res.status(200).json(new ApiResponse(200, tree, 'Category tree fetched'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/categories/:id
// ---------------------------------------------------------------------------
export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  res.status(200).json(new ApiResponse(200, category));
});

// ---------------------------------------------------------------------------
// PUT /api/v1/categories/:id  (Admin/Super Admin)
// ---------------------------------------------------------------------------
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  const { name, parent, themeColor, description, seo, sortOrder, isActive, showOnHomepage, isFeatured } = req.body;

  if (parent) {
    if (parent === req.params.id) throw ApiError.badRequest('A category cannot be its own parent');
    const parentExists = await Category.findById(parent);
    if (!parentExists) throw ApiError.badRequest('Parent category does not exist');
  }

  if (name && name !== category.name) {
    category.name = name;
    category.slug = await generateUniqueSlug(name, req.params.id);
  }

  if (req.file) {
    if (category.banner?.fileId) await deleteFromImageKit(category.banner.fileId);
    const uploaded = await uploadToImageKit(req.file.buffer, req.file.originalname, 'categories');
    category.banner = { url: uploaded.url, fileId: uploaded.fileId };
  }

  if (parent !== undefined) category.parent = parent || null;
  if (themeColor !== undefined) category.themeColor = themeColor;
  if (description !== undefined) category.description = description;
  if (seo !== undefined) category.seo = { ...category.seo, ...seo };
  if (sortOrder !== undefined) category.sortOrder = sortOrder;
  if (isActive !== undefined) category.isActive = isActive;
  if (showOnHomepage !== undefined) category.showOnHomepage = showOnHomepage;
  if (isFeatured !== undefined) category.isFeatured = isFeatured;
  category.updatedBy = req.user!.userId as unknown as typeof category.updatedBy;

  await category.save();
  await logAudit(req.user!.userId, 'CATEGORY_UPDATED', req, `Updated category: ${category.name}`);

  res.status(200).json(new ApiResponse(200, category, 'Category updated successfully'));
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/categories/:id  (Super Admin only — enforced at route level)
// ---------------------------------------------------------------------------
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  const childCount = await Category.countDocuments({ parent: category._id });
  if (childCount > 0) {
    throw ApiError.badRequest('Cannot delete a category that has subcategories. Delete or move them first.');
  }

  // TODO: once Service model exists, also block deletion if services reference this category.

  if (category.banner?.fileId) await deleteFromImageKit(category.banner.fileId);
  await category.deleteOne();

  await logAudit(req.user!.userId, 'CATEGORY_DELETED', req, `Deleted category: ${category.name}`);

  res.status(200).json(new ApiResponse(200, {}, 'Category deleted successfully'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/categories/:id/status  (toggle active/inactive)
// ---------------------------------------------------------------------------
export const toggleCategoryStatus = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  category.isActive = !category.isActive;
  await category.save();

  await logAudit(
    req.user!.userId,
    'CATEGORY_STATUS_TOGGLED',
    req,
    `${category.name} set to ${category.isActive ? 'active' : 'inactive'}`,
  );

  res.status(200).json(new ApiResponse(200, category, 'Category status updated'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/categories/reorder  (bulk sort order update, no-code drag/drop)
// ---------------------------------------------------------------------------
export const reorderCategories = asyncHandler(async (req: Request, res: Response) => {
  const { items } = req.body as { items: { id: string; sortOrder: number }[] };

  await Promise.all(
    items.map((item) => Category.findByIdAndUpdate(item.id, { sortOrder: item.sortOrder })),
  );

  await logAudit(req.user!.userId, 'CATEGORY_REORDERED', req, `Reordered ${items.length} categories`);

  res.status(200).json(new ApiResponse(200, {}, 'Categories reordered successfully'));
});

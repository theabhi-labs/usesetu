import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { MediaAsset } from '../models/mediaAsset.model';
import { Tenant } from '../models/tenant.model';
import { uploadToImageKit, deleteFromImageKit } from '../services/imagekit.service';

import { Application } from '../models/application.model';
import { EntitlementService } from '../services/entitlement.service';

export const uploadMedia = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file provided');

  let tenantId = req.tenantId || (req.user as any)?.tenantId;
  if (!tenantId) {
    const fallbackTenant =
      (await Tenant.findOne({ slug: 'usesetu-master' }).setOptions({ bypassTenantQuery: true })) ||
      (await Tenant.findOne().setOptions({ bypassTenantQuery: true }));
    if (fallbackTenant) {
      tenantId = String(fallbackTenant._id);
    }
  }

  let app: any = null;
  if (tenantId) {
    app = await Application.findOne({ tenantId }).setOptions({ bypassTenantQuery: true });
    if (app) {
      // Enforce storage byte quota before uploading
      await EntitlementService.assertWithinLimit(app._id, 'storage_bytes', req.file.size);
    }
  }

  const folder = (req.body.folder as string) || 'general';
  const uploaded = await uploadToImageKit(req.file.buffer, req.file.originalname, `media/${folder}`);

  const asset = await MediaAsset.create({
    url: uploaded.url,
    fileId: uploaded.fileId,
    fileName: req.file.originalname,
    folder,
    mimeType: req.file.mimetype,
    size: req.file.size,
    tags: req.body.tags ? String(req.body.tags).split(',').map((t) => t.trim()) : [],
    uploadedBy: req.user!.userId,
    tenantId,
  });

  if (app) {
    // Record storage usage atomically on successful upload
    await EntitlementService.recordUsage(app._id, 'storage_bytes', req.file.size);
  }

  res.status(201).json(new ApiResponse(201, asset, 'File uploaded'));
});

export const listMedia = asyncHandler(async (req: Request, res: Response) => {
  const { folder, search, page = '1', limit = '40' } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (folder) filter.folder = folder;
  if (search) filter.$text = { $search: search };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 40));

  const [assets, total] = await Promise.all([
    MediaAsset.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    MediaAsset.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      assets,
      media: assets,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }),
  );
});

export const deleteMedia = asyncHandler(async (req: Request, res: Response) => {
  const asset = await MediaAsset.findById(req.params.id);
  if (!asset) throw ApiError.notFound('Media asset not found');

  await deleteFromImageKit(asset.fileId);
  const assetSize = asset.size;
  await asset.deleteOne();

  if (req.tenantId && assetSize) {
    const app = await Application.findOne({ tenantId: req.tenantId }).setOptions({ bypassTenantQuery: true });
    if (app) {
      await EntitlementService.releaseUsage(app._id, 'storage_bytes', assetSize);
    }
  }

  res.status(200).json(new ApiResponse(200, {}, 'Media asset deleted'));
});

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { LockerDocument } from '../models/lockerDocument.model';
import { uploadToImageKit, deleteFromImageKit } from '../services/imagekit.service';
import { Role } from '../types/auth.types';

// ---------------------------------------------------------------------------
// GET /api/v1/locker  (Customer own, Admin/Staff with ?customer=id)
// ---------------------------------------------------------------------------
export const getLockerDocuments = asyncHandler(async (req: Request, res: Response) => {
  let customerId = req.user!.userId;
  if (req.user!.role !== Role.CUSTOMER && req.query.customer) {
    customerId = req.query.customer as string;
  }

  const documents = await LockerDocument.find({ customer: customerId }).sort({ createdAt: -1 }).lean();
  res.status(200).json(new ApiResponse(200, documents, 'Locker documents retrieved successfully'));
});

import { Application } from '../models/application.model';
import { EntitlementService } from '../services/entitlement.service';

// ---------------------------------------------------------------------------
// POST /api/v1/locker  (Customer own, Admin/Staff with body.customer)
// ---------------------------------------------------------------------------
export const uploadLockerDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file provided');

  let app: any = null;
  if (req.tenantId) {
    app = await Application.findOne({ tenantId: req.tenantId }).setOptions({ bypassTenantQuery: true });
    if (app) {
      await EntitlementService.assertWithinLimit(app._id, 'storage_bytes', req.file.size);
    }
  }

  let customerId = req.user!.userId;
  if (req.user!.role !== Role.CUSTOMER && req.body.customer) {
    customerId = req.body.customer;
  }

  const type = req.body.type || 'other';

  const uploaded = await uploadToImageKit(
    req.file.buffer,
    req.file.originalname,
    `locker/${customerId}`
  );

  const doc = await LockerDocument.create({
    customer: customerId,
    type,
    url: uploaded.url,
    fileId: uploaded.fileId,
    originalName: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
  });

  if (app) {
    await EntitlementService.recordUsage(app._id, 'storage_bytes', req.file.size);
  }

  res.status(201).json(new ApiResponse(201, doc, 'Document uploaded to locker successfully'));
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/locker/:id  (Customer own, Admin/Staff)
// ---------------------------------------------------------------------------
export const deleteLockerDocument = asyncHandler(async (req: Request, res: Response) => {
  const doc = await LockerDocument.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Locker document not found');

  if (req.user!.role === Role.CUSTOMER && String(doc.customer) !== req.user!.userId) {
    throw ApiError.forbidden('You do not have access to this document');
  }

  try {
    await deleteFromImageKit(doc.fileId);
  } catch (err) {
    // Suppress ImageKit delete errors to keep DB clean
  }

  const docSize = doc.size;
  await LockerDocument.findByIdAndDelete(doc._id);

  if (req.tenantId && docSize) {
    const app = await Application.findOne({ tenantId: req.tenantId }).setOptions({ bypassTenantQuery: true });
    if (app) {
      await EntitlementService.releaseUsage(app._id, 'storage_bytes', docSize);
    }
  }

  res.status(200).json(new ApiResponse(200, null, 'Locker document deleted successfully'));
});

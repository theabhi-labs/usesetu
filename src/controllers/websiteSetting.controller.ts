import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { WebsiteSetting } from '../models/websiteSetting.model';

const SINGLETON_ID = 'singleton';

// ---------------------------------------------------------------------------
// GET /api/v1/cms/settings  (Public — cache candidate: key `cms:settings`,
// TTL ~5min, invalidated on every PUT below)
// ---------------------------------------------------------------------------
export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await WebsiteSetting.findOneAndUpdate(
    { _id: SINGLETON_ID },
    { $setOnInsert: { _id: SINGLETON_ID } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  res.status(200).json(new ApiResponse(200, settings));
});

// ---------------------------------------------------------------------------
// PUT /api/v1/cms/settings  (Admin)
// ---------------------------------------------------------------------------
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await WebsiteSetting.findOneAndUpdate(
    { _id: SINGLETON_ID },
    { ...req.body, updatedBy: req.user!.userId },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  res.status(200).json(new ApiResponse(200, settings, 'Website settings updated'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/cms/settings/maintenance  (Admin)
// ---------------------------------------------------------------------------
export const toggleMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const settings = await WebsiteSetting.findOneAndUpdate(
    { _id: SINGLETON_ID },
    { maintenanceMode: req.body, updatedBy: req.user!.userId },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  res.status(200).json(new ApiResponse(200, settings, 'Maintenance mode updated'));
});

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { Menu } from '../models/menu.model';

// ---------------------------------------------------------------------------
// GET /api/v1/cms/menus/:location  (Public)
// ---------------------------------------------------------------------------
export const getMenu = asyncHandler(async (req: Request, res: Response) => {
  const menu = await Menu.findOne({ location: req.params.location }).lean();
  if (!menu) {
    res.status(200).json(new ApiResponse(200, { location: req.params.location, items: [] }));
    return;
  }
  res.status(200).json(new ApiResponse(200, menu));
});

// ---------------------------------------------------------------------------
// PUT /api/v1/cms/menus  (Admin — replaces the entire item tree for a location)
// Simplest correct approach for an embedded tree: the admin builder sends
// the whole reordered/edited array back on every save rather than diffing
// individual item mutations against the server.
// ---------------------------------------------------------------------------
export const upsertMenu = asyncHandler(async (req: Request, res: Response) => {
  const { location, items } = req.body;

  const menu = await Menu.findOneAndUpdate(
    { location },
    { items, updatedBy: req.user!.userId },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  res.status(200).json(new ApiResponse(200, menu, 'Menu saved'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/cms/menus  (Admin — list all locations at once)
// ---------------------------------------------------------------------------
export const listMenus = asyncHandler(async (_req: Request, res: Response) => {
  const menus = await Menu.find().lean();
  res.status(200).json(new ApiResponse(200, menus));
});

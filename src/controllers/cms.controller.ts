import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { Page } from '../models/page.model';
import { Banner } from '../models/banner.model';
import { Faq } from '../models/faq.model';
import { Announcement } from '../models/announcement.model';
import { uploadToImageKit, deleteFromImageKit } from '../services/imagekit.service';

// ═══════════════════════════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════════════════════════

export const createPage = asyncHandler(async (req: Request, res: Response) => {
  const exists = await Page.exists({ slug: req.body.slug });
  if (exists) throw ApiError.conflict('A page with this slug already exists');

  const page = await Page.create({ ...req.body, createdBy: req.user!.userId });
  res.status(201).json(new ApiResponse(201, page, 'Page created'));
});

export const getPages = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const pages = await Page.find(filter).select('slug title type status showInMenu updatedAt').sort({ updatedAt: -1 }).lean();
  res.status(200).json(new ApiResponse(200, pages));
});

export const updatePage = asyncHandler(async (req: Request, res: Response) => {
  const page = await Page.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user!.userId }, { new: true });
  if (!page) throw ApiError.notFound('Page not found');
  res.status(200).json(new ApiResponse(200, page, 'Page updated'));
});

export const deletePage = asyncHandler(async (req: Request, res: Response) => {
  const result = await Page.findByIdAndDelete(req.params.id);
  if (!result) throw ApiError.notFound('Page not found');
  res.status(200).json(new ApiResponse(200, {}, 'Page deleted'));
});

export const getPublicPage = asyncHandler(async (req: Request, res: Response) => {
  const page = await Page.findOne({ slug: req.params.slug, status: 'published' }).lean();
  if (!page) throw ApiError.notFound('Page not found');
  res.status(200).json(new ApiResponse(200, page));
});

// ═══════════════════════════════════════════════════════════════════
// BANNERS
// ═══════════════════════════════════════════════════════════════════

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('Banner image is required');
  const uploaded = await uploadToImageKit(req.file.buffer, req.file.originalname, 'banners');

  const banner = await Banner.create({
    ...req.body,
    image: { url: uploaded.url, fileId: uploaded.fileId },
    createdBy: req.user!.userId,
  });
  res.status(201).json(new ApiResponse(201, banner, 'Banner created'));
});

export const getBanners = asyncHandler(async (_req: Request, res: Response) => {
  const banners = await Banner.find().sort({ sortOrder: 1 }).lean();
  res.status(200).json(new ApiResponse(200, banners));
});

export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw ApiError.notFound('Banner not found');

  if (req.file) {
    await deleteFromImageKit(banner.image.fileId);
    const uploaded = await uploadToImageKit(req.file.buffer, req.file.originalname, 'banners');
    banner.image = { url: uploaded.url, fileId: uploaded.fileId };
  }
  Object.assign(banner, req.body);
  await banner.save();

  res.status(200).json(new ApiResponse(200, banner, 'Banner updated'));
});

export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw ApiError.notFound('Banner not found');
  await deleteFromImageKit(banner.image.fileId);
  await banner.deleteOne();
  res.status(200).json(new ApiResponse(200, {}, 'Banner deleted'));
});

// GET /cms/banners/public — active + currently within its optional schedule window
export const getPublicBanners = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const banners = await Banner.find({
    isActive: true,
    $and: [
      { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] },
    ],
  })
    .sort({ sortOrder: 1 })
    .lean();

  res.status(200).json(new ApiResponse(200, banners));
});

// ═══════════════════════════════════════════════════════════════════
// FAQs
// ═══════════════════════════════════════════════════════════════════

export const createFaq = asyncHandler(async (req: Request, res: Response) => {
  const faq = await Faq.create({ ...req.body, createdBy: req.user!.userId });
  res.status(201).json(new ApiResponse(201, faq, 'FAQ created'));
});

export const getFaqs = asyncHandler(async (req: Request, res: Response) => {
  const { category, service } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (category) filter.category = category;
  if (service) filter.service = service;

  const faqs = await Faq.find(filter).sort({ sortOrder: 1 }).lean();
  res.status(200).json(new ApiResponse(200, faqs));
});

export const updateFaq = asyncHandler(async (req: Request, res: Response) => {
  const faq = await Faq.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!faq) throw ApiError.notFound('FAQ not found');
  res.status(200).json(new ApiResponse(200, faq, 'FAQ updated'));
});

export const deleteFaq = asyncHandler(async (req: Request, res: Response) => {
  const result = await Faq.findByIdAndDelete(req.params.id);
  if (!result) throw ApiError.notFound('FAQ not found');
  res.status(200).json(new ApiResponse(200, {}, 'FAQ deleted'));
});

// GET /cms/faqs/public — active only, optional category/service/search filters
export const getPublicFaqs = asyncHandler(async (req: Request, res: Response) => {
  const { category, service, search } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { isActive: true };
  if (category) filter.category = category;
  if (service) filter.service = service;
  if (search) filter.$text = { $search: search };

  const faqs = await Faq.find(filter).select('question answer category sortOrder').sort({ sortOrder: 1 }).lean();
  res.status(200).json(new ApiResponse(200, faqs));
});

// ═══════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════

export const createAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || req.user?.tenantId;
  const announcement = await Announcement.create({
    ...req.body,
    startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
    ...(tenantId ? { tenantId } : {}),
    createdBy: req.user!.userId,
  });
  res.status(201).json(new ApiResponse(201, announcement, 'Announcement created'));
});

export const getAnnouncements = asyncHandler(async (_req: Request, res: Response) => {
  const announcements = await Announcement.find().sort({ isPinned: -1, priority: -1, createdAt: -1 }).lean();
  res.status(200).json(new ApiResponse(200, announcements));
});

export const updateAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!announcement) throw ApiError.notFound('Announcement not found');
  res.status(200).json(new ApiResponse(200, announcement, 'Announcement updated'));
});

export const deleteAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const result = await Announcement.findByIdAndDelete(req.params.id);
  if (!result) throw ApiError.notFound('Announcement not found');
  res.status(200).json(new ApiResponse(200, {}, 'Announcement deleted'));
});

// GET /cms/announcements/public — active + currently within date range, pinned first
export const getPublicAnnouncements = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date(Date.now() + 60 * 1000); // 1-minute grace for slight server/client skew
  const announcements = await Announcement.find({
    isActive: true,
    $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }],
    $and: [{ $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }] }],
  })
    .select('title content type isPinned priority startDate endDate')
    .sort({ isPinned: -1, priority: -1, createdAt: -1 })
    .lean();

  res.status(200).json(new ApiResponse(200, announcements));
});

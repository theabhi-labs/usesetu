import { Router } from 'express';
import { getSettings, updateSettings, toggleMaintenance } from '../controllers/websiteSetting.controller';
import { getMenu, upsertMenu, listMenus } from '../controllers/menu.controller';
import {
  createPage,
  getPages,
  updatePage,
  deletePage,
  getPublicPage,
  createBanner,
  getBanners,
  updateBanner,
  deleteBanner,
  getPublicBanners,
  createFaq,
  getFaqs,
  updateFaq,
  deleteFaq,
  getPublicFaqs,
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  getPublicAnnouncements,
} from '../controllers/cms.controller';
import { uploadMedia, listMedia, deleteMedia } from '../controllers/media.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadImage } from '../middlewares/upload.middleware';
import { Role } from '../types/auth.types';
import {
  updateWebsiteSettingSchema,
  toggleMaintenanceSchema,
  upsertMenuSchema,
  createPageSchema,
  updatePageSchema,
  idParamSchema,
  createBannerSchema,
  createFaqSchema,
  updateFaqSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from '../validators/cms.validator';

const router = Router();

// ═══════════════ Public — no auth, consumed by the customer website ═══════════════
router.get('/settings', getSettings);
router.get('/menus/:location', getMenu);
router.get('/pages/public/:slug', getPublicPage);
router.get('/banners/public', getPublicBanners);
router.get('/faqs/public', getPublicFaqs);
router.get('/announcements/public', getPublicAnnouncements);

// ═══════════════ Admin — everything else ═══════════════
router.use(isAuthenticated, authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN));

router.put('/settings', validate(updateWebsiteSettingSchema), updateSettings);
router.patch('/settings/maintenance', validate(toggleMaintenanceSchema), toggleMaintenance);

router.get('/menus', listMenus);
router.put('/menus', validate(upsertMenuSchema), upsertMenu);

router.post('/pages', validate(createPageSchema), createPage);
router.get('/pages', getPages);
router.put('/pages/:id', validate(updatePageSchema), updatePage);
router.delete('/pages/:id', validate(idParamSchema), deletePage);

router.post('/banners', uploadImage.single('image'), validate(createBannerSchema), createBanner);
router.get('/banners', getBanners);
router.put('/banners/:id', uploadImage.single('image'), validate(idParamSchema), updateBanner);
router.delete('/banners/:id', validate(idParamSchema), deleteBanner);

router.post('/faqs', validate(createFaqSchema), createFaq);
router.get('/faqs', getFaqs);
router.put('/faqs/:id', validate(updateFaqSchema), updateFaq);
router.delete('/faqs/:id', validate(idParamSchema), deleteFaq);

router.post('/announcements', validate(createAnnouncementSchema), createAnnouncement);
router.get('/announcements', getAnnouncements);
router.put('/announcements/:id', validate(updateAnnouncementSchema), updateAnnouncement);
router.delete('/announcements/:id', validate(idParamSchema), deleteAnnouncement);

router.post('/media', uploadImage.single('file'), uploadMedia);
router.get('/media', listMedia);
router.delete('/media/:id', validate(idParamSchema), deleteMedia);

export default router;

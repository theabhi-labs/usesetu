import { Router } from 'express';
import {
  getPublicApplicationContext,
  getPublicApplicationSitemap,
  getPublicApplicationRobots,
} from '../controllers/publicApplication.controller';

const router = Router();

// Publicly accessible application context resolution
router.get('/context', getPublicApplicationContext);
router.get('/sitemap', getPublicApplicationSitemap);
router.get('/sitemap.xml', getPublicApplicationSitemap);
router.get('/robots', getPublicApplicationRobots);
router.get('/robots.txt', getPublicApplicationRobots);

export default router;

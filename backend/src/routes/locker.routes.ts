import { Router } from 'express';
import {
  getLockerDocuments,
  uploadLockerDocument,
  deleteLockerDocument,
} from '../controllers/locker.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { uploadDocument as uploadDocMiddleware } from '../middlewares/upload.middleware';

const router = Router();

// Locker endpoints are restricted to authenticated users (both Customers and Staff/Admins)
router.use(isAuthenticated);

router.get('/', getLockerDocuments);
router.post('/', uploadDocMiddleware.single('file'), uploadLockerDocument);
router.delete('/:id', deleteLockerDocument);

export default router;

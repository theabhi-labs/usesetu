import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const storage = multer.memoryStorage();

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(ApiError.badRequest('Only JPG, PNG, WEBP, or SVG images are allowed') as unknown as Error);
    }
    cb(null, true);
  },
});

export const uploadDocument = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_DOC_TYPES.includes(file.mimetype)) {
      return cb(ApiError.badRequest('Only image or PDF files are allowed') as unknown as Error);
    }
    cb(null, true);
  },
});

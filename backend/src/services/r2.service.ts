import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

/**
 * Cloudflare R2 S3-Compatible Client Initialization
 */
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export interface UploadResult {
  url: string;
  fileId: string;
  key: string;
  thumbnailUrl?: string;
}

/**
 * Clean & sanitize file name for safe storage keys
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Uploads a file buffer to Cloudflare R2 bucket under an organized folder structure.
 * @param buffer - File content buffer
 * @param fileName - Original file name
 * @param folder - Destination folder (e.g. "categories", "media/banners", "locker/cust_123")
 * @param mimeType - Optional MIME type
 */
export const uploadToR2 = async (
  buffer: Buffer,
  fileName: string,
  folder: string,
  mimeType?: string,
): Promise<UploadResult> => {
  try {
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    const cleanFileName = sanitizeFilename(fileName);
    const key = `csc-os/${cleanFolder}/${Date.now()}-${cleanFileName}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
      }),
    );

    const publicBase = env.R2_PUBLIC_URL.replace(/\/+$/, '');
    const publicUrl = `${publicBase}/${key}`;

    return {
      url: publicUrl,
      fileId: key,
      key,
      thumbnailUrl: publicUrl,
    };
  } catch (error) {
    logger.error(`Cloudflare R2 upload failed: ${(error as Error).message}`);
    throw ApiError.internal('File upload failed. Please try again.');
  }
};

/**
 * Deletes an object from Cloudflare R2 bucket.
 * @param fileId - The object key in R2
 */
export const deleteFromR2 = async (fileId: string): Promise<void> => {
  if (!fileId) return;

  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: fileId,
      }),
    );
  } catch (error) {
    // Non-fatal: log warning but do not crash calling flow
    logger.warn(`Cloudflare R2 delete failed for fileId=${fileId}: ${(error as Error).message}`);
  }
};

/**
 * Generates a presigned URL for direct client-to-R2 uploads.
 */
export const getPresignedUploadUrl = async (
  fileName: string,
  folder: string,
  mimeType?: string,
  expiresInSeconds = 3600,
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> => {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const cleanFileName = sanitizeFilename(fileName);
  const key = `csc-os/${cleanFolder}/${Date.now()}-${cleanFileName}`;

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: mimeType || 'application/octet-stream',
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
  const publicBase = env.R2_PUBLIC_URL.replace(/\/+$/, '');
  const publicUrl = `${publicBase}/${key}`;

  return { uploadUrl, key, publicUrl };
};

/**
 * Generates a presigned download URL for private R2 assets.
 */
export const getPresignedDownloadUrl = async (
  fileId: string,
  expiresInSeconds = 3600,
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: fileId,
  });

  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
};

// ---------------------------------------------------------------------------
// Backward-compatibility shims (re-exporting R2 handlers as legacy names)
// ---------------------------------------------------------------------------
export const uploadToImageKit = uploadToR2;
export const deleteFromImageKit = deleteFromR2;
export const getImageKitAuthParams = () => ({
  token: 'r2-storage-active',
  expire: Date.now() + 3600000,
  signature: 'r2-signature',
});

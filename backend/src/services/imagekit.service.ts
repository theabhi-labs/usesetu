import ImageKit from 'imagekit';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

const imagekit = new ImageKit({
  publicKey: env.IMAGEKIT_PUBLIC_KEY,
  privateKey: env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
});

interface UploadResult {
  url: string;
  fileId: string;
  thumbnailUrl?: string;
}

/**
 * Uploads a file buffer to ImageKit under an organized folder structure.
 * folder example: "categories", "services/icons", "users/avatars", "documents/aadhaar"
 */
export const uploadToImageKit = async (
  buffer: Buffer,
  fileName: string,
  folder: string,
): Promise<UploadResult> => {
  try {
    const result = await imagekit.upload({
      file: buffer,
      fileName: `${Date.now()}-${fileName}`,
      folder: `/csc-os/${folder}`,
      useUniqueFileName: true,
    });
    return { url: result.url, fileId: result.fileId, thumbnailUrl: result.thumbnailUrl };
  } catch (error) {
    logger.error(`ImageKit upload failed: ${(error as Error).message}`);
    throw ApiError.internal('File upload failed. Please try again.');
  }
};

export const deleteFromImageKit = async (fileId: string): Promise<void> => {
  try {
    await imagekit.deleteFile(fileId);
  } catch (error) {
    // Non-fatal: log but don't block the main operation on a cleanup failure
    logger.warn(`ImageKit delete failed for fileId=${fileId}: ${(error as Error).message}`);
  }
};

export const getImageKitAuthParams = () => {
  return imagekit.getAuthenticationParameters();
};

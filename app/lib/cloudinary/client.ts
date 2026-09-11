import { getCloudinaryEnvironment } from './environment';

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_STORED_BYTES = 1024 * 1024;
const ALLOWED_SOURCE_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export type CloudinaryPhoto = {
  cloudinaryPublicId: string;
  secureUrl: string;
  assetVersion: number;
  format: string;
  contentType: string;
  byteSize: number;
  width: number;
  height: number;
  deleteToken?: string;
};

type UploadResponse = {
  public_id?: unknown;
  secure_url?: unknown;
  version?: unknown;
  format?: unknown;
  resource_type?: unknown;
  bytes?: unknown;
  width?: unknown;
  height?: unknown;
  delete_token?: unknown;
  error?: { message?: unknown };
};

export function validatePhotoSource(file: Blob) {
  if (!ALLOWED_SOURCE_TYPES.has(file.type)) {
    throw new Error('Choose a JPEG, PNG, WebP, HEIC, or HEIF image.');
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Choose an image smaller than 20 MB.');
  }
}

export async function deleteRecentCloudinaryUpload(
  deleteToken: string,
  request: typeof fetch = fetch,
) {
  const { cloudName } = getCloudinaryEnvironment();
  const body = new URLSearchParams({ token: deleteToken });
  const response = await request(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/delete_by_token`,
    { method: 'POST', body },
  );

  if (!response.ok) {
    throw new Error('Cloudinary could not remove the recent upload.');
  }
}

export async function uploadCompletedProjectPhoto(
  file: File,
  request: typeof fetch = fetch,
): Promise<CloudinaryPhoto> {
  validatePhotoSource(file);
  const { cloudName, uploadPreset } = getCloudinaryEnvironment();
  const body = new FormData();
  body.set('file', file);
  body.set('upload_preset', uploadPreset);

  const response = await request(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    { method: 'POST', body },
  );
  const result = (await response.json()) as UploadResponse;

  if (!response.ok) {
    const message = typeof result.error?.message === 'string' ? result.error.message : undefined;
    throw new Error(message ?? 'Cloudinary could not upload the photo.');
  }

  const valid =
    result.resource_type === 'image' &&
    typeof result.public_id === 'string' &&
    typeof result.secure_url === 'string' &&
    result.secure_url.startsWith('https://') &&
    typeof result.version === 'number' &&
    typeof result.format === 'string' &&
    typeof result.bytes === 'number' &&
    typeof result.width === 'number' &&
    typeof result.height === 'number';

  if (!valid) {
    throw new Error('Cloudinary returned incomplete photo information.');
  }

  const byteSize = result.bytes as number;
  const format = result.format as string;

  if (byteSize > MAX_STORED_BYTES) {
    if (typeof result.delete_token === 'string') {
      await deleteRecentCloudinaryUpload(result.delete_token, request);
    }
    throw new Error('The optimized photo is still larger than 1 MB.');
  }

  return {
    cloudinaryPublicId: result.public_id as string,
    secureUrl: result.secure_url as string,
    assetVersion: result.version as number,
    format,
    contentType: format === 'jpg' ? 'image/jpeg' : `image/${format}`,
    byteSize,
    width: result.width as number,
    height: result.height as number,
    ...(typeof result.delete_token === 'string' && { deleteToken: result.delete_token }),
  };
}

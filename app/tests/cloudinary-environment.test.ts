import { describe, expect, it } from 'vitest';
import { readCloudinaryEnvironment } from '@/lib/cloudinary/environment';

describe('readCloudinaryEnvironment', () => {
  it('reads the public browser configuration', () => {
    expect(
      readCloudinaryEnvironment({
        NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'i69hbtkx',
        NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: 'hooked_completed_photos_v1',
      }),
    ).toEqual({ cloudName: 'i69hbtkx', uploadPreset: 'hooked_completed_photos_v1' });
  });

  it('rejects missing or malformed configuration', () => {
    expect(() => readCloudinaryEnvironment({})).toThrow('Missing Cloudinary');
    expect(() =>
      readCloudinaryEnvironment({
        NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'not/a/cloud',
        NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: 'preset',
      }),
    ).toThrow('Invalid Cloudinary cloud name');
  });
});

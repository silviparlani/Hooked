import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadCompletedProjectPhoto, validatePhotoSource } from '@/lib/cloudinary/client';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'i69hbtkx');
  vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET', 'hooked_completed_photos_v1');
});

describe('Cloudinary photo uploads', () => {
  it('rejects unsupported or oversized source files before upload', () => {
    expect(() => validatePhotoSource(new Blob(['text'], { type: 'text/plain' }))).toThrow(
      'Choose a JPEG',
    );
    expect(() =>
      validatePhotoSource(new Blob([new Uint8Array(20 * 1024 * 1024 + 1)], { type: 'image/jpeg' })),
    ).toThrow('smaller than 20 MB');
  });

  it('maps a valid upload response to Firestore-ready metadata', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          public_id: 'hooked/random-id',
          secure_url: 'https://res.cloudinary.com/i69hbtkx/image/upload/v1/hooked/random-id.jpg',
          version: 1,
          format: 'jpg',
          resource_type: 'image',
          bytes: 512_000,
          width: 1600,
          height: 1200,
        }),
        { status: 200 },
      ),
    );

    const photo = await uploadCompletedProjectPhoto(
      new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }),
      request,
    );

    expect(photo).toMatchObject({
      cloudinaryPublicId: 'hooked/random-id',
      byteSize: 512_000,
      contentType: 'image/jpeg',
    });
    expect(request).toHaveBeenCalledWith(
      'https://api.cloudinary.com/v1_1/i69hbtkx/image/upload',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('uses the short-lived delete token when an optimized result exceeds one megabyte', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            public_id: 'hooked/too-large',
            secure_url: 'https://res.cloudinary.com/i69hbtkx/image/upload/too-large.jpg',
            version: 1,
            format: 'jpg',
            resource_type: 'image',
            bytes: 1024 * 1024 + 1,
            width: 2000,
            height: 2000,
            delete_token: 'temporary-token',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await expect(
      uploadCompletedProjectPhoto(
        new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }),
        request,
      ),
    ).rejects.toThrow('still larger than 1 MB');
    expect(request).toHaveBeenLastCalledWith(
      'https://api.cloudinary.com/v1_1/i69hbtkx/delete_by_token',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

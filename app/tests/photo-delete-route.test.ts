import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/photos/delete/route';

describe('secure photo deletion endpoint', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects requests without a Firebase token', async () => {
    const response = await POST(
      new Request('http://localhost/api/photos/delete', { method: 'POST' }),
    );
    expect(response.status).toBe(401);
  });

  it('verifies ownership, destroys the Cloudinary asset, then deletes metadata', async () => {
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'firebase-key');
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'hooked-test');
    vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'hooked-cloud');
    vi.stubEnv('CLOUDINARY_API_KEY', 'cloud-key');
    vi.stubEnv('CLOUDINARY_API_SECRET', 'cloud-secret');
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ users: [{ localId: 'silvi', emailVerified: true }] }))
      .mockResolvedValueOnce(
        Response.json({ fields: { cloudinaryPublicId: { stringValue: 'hooked/photo-one' } } }),
      )
      .mockResolvedValueOnce(Response.json({ result: 'ok' }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', request);

    const response = await POST(
      new Request('http://localhost/api/photos/delete', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
        body: JSON.stringify({ projectId: 'project-one', photoId: 'photo-one' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(request).toHaveBeenCalledTimes(4);
    expect(request.mock.calls[2][0]).toContain('/image/destroy');
    expect(request.mock.calls[3][1]).toMatchObject({ method: 'DELETE' });
  });
});

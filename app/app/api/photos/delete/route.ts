const identifier = /^[A-Za-z0-9_-]{1,200}$/;

function json(status: number, message: string) {
  return Response.json({ message }, { status });
}

async function sha1(value: string) {
  const bytes = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function authenticatedUser(token: string): Promise<{ localId: string }> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Firebase authentication is not configured.');
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    },
  );
  if (!response.ok) throw new Error('Firebase authentication failed.');
  const result = (await response.json()) as {
    users?: { localId?: string; emailVerified?: boolean }[];
  };
  const user = result.users?.[0];
  if (!user?.localId || user.emailVerified !== true)
    throw new Error('A verified account is required.');
  return { localId: user.localId };
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return json(401, 'Sign in again before deleting this photo.');

  let body: { projectId?: unknown; photoId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, 'Invalid deletion request.');
  }
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const photoId = typeof body.photoId === 'string' ? body.photoId : '';
  if (!identifier.test(projectId) || !identifier.test(photoId))
    return json(400, 'Invalid project or photo.');

  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!firebaseProjectId || !cloudName || !apiKey || !apiSecret)
    return json(503, 'Secure photo deletion is not configured yet.');

  let localId: string;
  try {
    localId = (await authenticatedUser(token)).localId;
  } catch {
    return json(401, 'Sign in again before deleting this photo.');
  }

  const documentUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}/databases/(default)/documents/users/${encodeURIComponent(localId)}/projects/${encodeURIComponent(projectId)}/photos/${encodeURIComponent(photoId)}`;
  const photoResponse = await fetch(documentUrl, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (photoResponse.status === 404) return Response.json({ deleted: true });
  if (!photoResponse.ok)
    return json(photoResponse.status === 403 ? 403 : 502, 'Hooked could not verify this photo.');
  const photo = (await photoResponse.json()) as {
    fields?: { cloudinaryPublicId?: { stringValue?: string } };
  };
  const publicId = photo.fields?.cloudinaryPublicId?.stringValue;
  if (!publicId) return json(422, 'This photo has no valid storage identifier.');

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await sha1(
    `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`,
  );
  const cloudinaryBody = new URLSearchParams({
    public_id: publicId,
    timestamp,
    api_key: apiKey,
    signature,
    invalidate: 'true',
  });
  const cloudinaryResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`,
    { method: 'POST', body: cloudinaryBody },
  );
  const result = (await cloudinaryResponse.json()) as { result?: string };
  if (!cloudinaryResponse.ok || !['ok', 'not found'].includes(result.result ?? ''))
    return json(502, 'Cloudinary could not permanently delete this photo.');

  const deleteResponse = await fetch(documentUrl, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!deleteResponse.ok && deleteResponse.status !== 404)
    return json(502, 'The photo was deleted from storage, but Hooked could not finish cleanup.');
  return Response.json({ deleted: true });
}

import { readFile } from 'node:fs/promises';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDocs,
  getDoc,
  writeBatch,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import { addProjectPhoto } from '@/lib/firebase/project-photo-repository';
import { startProject } from '@/lib/firebase/project-repository';
let environment: RulesTestEnvironment;
let db: Firestore;
vi.mock('@/lib/firebase/client', () => ({
  getFirebaseClient: () => ({
    firestore: db,
    auth: { currentUser: { uid: 'owner', getIdToken: async () => 'emulator-test-token' } },
  }),
}));
const photo = {
  cloudinaryPublicId: 'test/photo',
  secureUrl: 'https://example.com/test.jpg',
  assetVersion: 1,
  format: 'jpg',
  contentType: 'image/jpeg',
  byteSize: 100,
  width: 400,
  height: 300,
};
beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-hooked-photos',
    firestore: { rules: await readFile('firestore.rules', 'utf8') },
  });
  db = environment
    .authenticatedContext('owner', { email_verified: true })
    .firestore() as unknown as Firestore;
});
afterAll(async () => environment?.cleanup());
afterEach(() => vi.unstubAllGlobals());
beforeEach(async () => {
  await environment.clearFirestore();
  for (const status of ['planned', 'active', 'completed'])
    await setDoc(doc(db, 'users/owner/projects/' + status), {
      name: 'Photo test',
      status,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      schemaVersion: 1,
    });
});
describe('separate reference and completed photos', () => {
  it('allows exactly one reference photo and no finished photos on Someday', async () => {
    await addProjectPhoto('owner', 'planned', photo, true);
    await expect(addProjectPhoto('owner', 'planned', photo, true)).rejects.toThrow(
      'existing reference',
    );
    await expect(addProjectPhoto('owner', 'planned', photo)).rejects.toThrow('Complete');
    await assertFails(
      setDoc(doc(db, 'users/owner/projects/planned/referencePhotos/extra'), {
        ...photo,
        createdAt: Timestamp.now(),
      }),
    );
  });
  it('allows five finished photos without a reference image', async () => {
    for (let index = 0; index < 5; index++) await addProjectPhoto('owner', 'completed', photo);
    await expect(addProjectPhoto('owner', 'completed', photo)).rejects.toThrow('five photos');
    expect((await getDocs(collection(db, 'users/owner/projects/completed/photos'))).size).toBe(5);
    expect(
      (await getDocs(collection(db, 'users/owner/projects/completed/referencePhotos'))).size,
    ).toBe(0);
  });
  it.each(['active', 'completed'])('rejects reference uploads on %s projects', async (status) => {
    await expect(addProjectPhoto('owner', status, photo, true)).rejects.toThrow('Someday');
    await assertFails(
      setDoc(doc(db, `users/owner/projects/${status}/referencePhotos/cover`), {
        ...photo,
        createdAt: Timestamp.now(),
      }),
    );
  });
  it('requires reference cleanup before starting a project', async () => {
    await addProjectPhoto('owner', 'planned', photo, true);
    const parent = doc(db, 'users/owner/projects/planned');
    await assertFails(updateDoc(parent, { status: 'active' }));
    await deleteDoc(doc(db, 'users/owner/projects/planned/referencePhotos/cover'));
    await updateDoc(parent, { status: 'active' });
    await expect(addProjectPhoto('owner', 'planned', photo, true)).rejects.toThrow('Someday');
  });
  it('keeps Someday on cleanup failure and successfully retries Start', async () => {
    await addProjectPhoto('owner', 'planned', photo, true);
    const parent = doc(db, 'users/owner/projects/planned');
    const reference = doc(db, 'users/owner/projects/planned/referencePhotos/cover');
    const input = { name: 'Photo test', status: 'planned' as const };
    const request = vi
      .fn()
      .mockResolvedValue(Response.json({ message: 'Cleanup failed' }, { status: 502 }));
    vi.stubGlobal('fetch', request);
    await expect(startProject('owner', 'planned', input)).rejects.toThrow('Cleanup failed');
    expect((await getDoc(parent)).data()?.status).toBe('planned');
    expect((await getDoc(reference)).exists()).toBe(true);
    request.mockImplementation(async () => {
      expect((await getDoc(parent)).data()?.status).toBe('planned');
      await deleteDoc(reference);
      return Response.json({ deleted: true });
    });
    await startProject('owner', 'planned', input);
    expect((await getDoc(parent)).data()?.status).toBe('active');
    expect((await getDoc(reference)).exists()).toBe(false);
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
      projectId: 'planned',
      photoId: 'cover',
      reference: true,
    });
  });
  it('rejects starting and adding a reference in the same atomic write', async () => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users/owner/projects/planned'), { status: 'active' });
    batch.set(doc(db, 'users/owner/projects/planned/referencePhotos/cover'), {
      ...photo,
      createdAt: Timestamp.now(),
    });
    await assertFails(batch.commit());
  });
  it('protects the limit against simultaneous uploads', async () => {
    for (let index = 0; index < 4; index++) await addProjectPhoto('owner', 'completed', photo);
    const results = await Promise.allSettled([
      addProjectPhoto('owner', 'completed', photo),
      addProjectPhoto('owner', 'completed', photo),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await getDocs(collection(db, 'users/owner/projects/completed/photos'))).size).toBe(5);
  });
});

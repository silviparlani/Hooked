import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDocs, collection, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { addProjectPhoto } from '@/lib/firebase/project-photo-repository';
let environment: RulesTestEnvironment;
let db: Firestore;
vi.mock('@/lib/firebase/client', () => ({ getFirebaseClient: () => ({ firestore: db }) }));
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
beforeEach(async () => {
  await environment.clearFirestore();
  for (const status of ['planned', 'completed'])
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
  it('does not count the reference against the five finished photos', async () => {
    await addProjectPhoto('owner', 'completed', photo, true);
    for (let index = 0; index < 5; index++) await addProjectPhoto('owner', 'completed', photo);
    await expect(addProjectPhoto('owner', 'completed', photo)).rejects.toThrow('five photos');
    expect((await getDocs(collection(db, 'users/owner/projects/completed/photos'))).size).toBe(5);
    expect(
      (await getDocs(collection(db, 'users/owner/projects/completed/referencePhotos'))).size,
    ).toBe(1);
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

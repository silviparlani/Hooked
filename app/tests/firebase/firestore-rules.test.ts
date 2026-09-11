import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-hooked',
    firestore: { rules: await readFile('firestore.rules', 'utf8') },
  });
});

afterAll(async () => environment.cleanup());

describe('Firestore ownership rules', () => {
  it('allows a user to read and write their own project path', async () => {
    const firestore = environment
      .authenticatedContext('silvi', { email_verified: true })
      .firestore();
    const project = doc(firestore, 'users/silvi/projects/cardigan');

    await assertSucceeds(
      setDoc(project, {
        name: 'Cardigan',
        status: 'planned',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        schemaVersion: 1,
      }),
    );
    await assertSucceeds(getDoc(project));
  });

  it('denies another user and signed-out access', async () => {
    const ownerProject = doc(
      environment.authenticatedContext('someone-else', { email_verified: true }).firestore(),
      'users/silvi/projects/cardigan',
    );
    const signedOutProject = doc(
      environment.unauthenticatedContext().firestore(),
      'users/silvi/projects/cardigan',
    );

    await assertFails(getDoc(ownerProject));
    await assertFails(getDoc(signedOutProject));
  });

  it('denies an authenticated user whose email is not verified', async () => {
    const project = doc(
      environment.authenticatedContext('silvi', { email_verified: false }).firestore(),
      'users/silvi/projects/cardigan',
    );
    await assertFails(getDoc(project));
  });

  it('denies malformed project documents', async () => {
    const project = doc(
      environment.authenticatedContext('silvi', { email_verified: true }).firestore(),
      'users/silvi/projects/broken',
    );
    await assertFails(
      setDoc(project, {
        name: 'Broken',
        status: 'unknown',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        schemaVersion: 1,
      }),
    );
  });

  it('allows verified owners to create sections and non-negative yarn counters', async () => {
    const firestore = environment
      .authenticatedContext('silvi', { email_verified: true })
      .firestore();
    const section = doc(firestore, 'users/silvi/projects/cardigan/sections/body');
    const yarn = doc(firestore, 'users/silvi/projects/cardigan/yarns/green');
    await assertSucceeds(
      setDoc(section, {
        name: 'Body',
        parentSectionId: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
    await assertSucceeds(
      setDoc(yarn, {
        name: 'Green cotton',
        material: 'Cotton',
        category: 'DK',
        colour: 'Green',
        quantity: 0,
        unit: 'skeins',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it('denies negative yarn quantities', async () => {
    const firestore = environment
      .authenticatedContext('silvi', { email_verified: true })
      .firestore();
    const yarn = doc(firestore, 'users/silvi/projects/cardigan/yarns/green');
    await assertFails(
      setDoc(yarn, {
        name: 'Green cotton',
        material: 'Cotton',
        category: 'DK',
        colour: 'Green',
        quantity: -1,
        unit: 'skeins',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it('allows valid counters and denies invalid counter bounds', async () => {
    const firestore = environment
      .authenticatedContext('silvi', { email_verified: true })
      .firestore();
    const valid = doc(firestore, 'users/silvi/projects/cardigan/sections/body/counters/dc');
    const negative = doc(
      firestore,
      'users/silvi/projects/cardigan/sections/body/counters/negative',
    );
    const pastTarget = doc(
      firestore,
      'users/silvi/projects/cardigan/sections/body/counters/past-target',
    );
    await assertSucceeds(
      setDoc(valid, {
        name: 'Double crochet',
        current: 1,
        target: 2,
        stitchType: 'custom',
        customStitchName: 'Crossed double crochet',
        customStitchInstructions: 'Skip one stitch, work back into it.',
        stitchesPerRow: 24,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
    await assertFails(
      setDoc(doc(firestore, 'users/silvi/projects/cardigan/sections/body/counters/bad-custom'), {
        name: 'Missing instructions',
        current: 0,
        target: null,
        stitchType: 'custom',
        stitchesPerRow: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
    await assertFails(
      setDoc(negative, {
        name: 'Invalid',
        current: -1,
        target: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
    await assertFails(
      setDoc(pastTarget, {
        name: 'Invalid',
        current: 3,
        target: 2,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it('denies creation of new child sections', async () => {
    const firestore = environment
      .authenticatedContext('silvi', { email_verified: true })
      .firestore();
    const child = doc(firestore, 'users/silvi/projects/cardigan/sections/cuff');
    await assertFails(
      setDoc(child, {
        name: 'Cuff',
        parentSectionId: 'sleeve',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it('denies counter access outside the owner path', async () => {
    const counter = doc(
      environment.authenticatedContext('someone-else', { email_verified: true }).firestore(),
      'users/silvi/projects/cardigan/sections/body/counters/dc',
    );
    await assertFails(getDoc(counter));
  });

  it('allows valid inventory and denies zero quantity', async () => {
    const firestore = environment
      .authenticatedContext('silvi', { email_verified: true })
      .firestore();
    const valid = doc(firestore, 'users/silvi/inventory/green');
    const zero = doc(firestore, 'users/silvi/inventory/empty');
    await assertSucceeds(
      setDoc(valid, {
        material: 'Wool',
        category: 'DK',
        colour: 'Green',
        quantity: 0.5,
        unit: 'skeins',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
    await assertFails(
      setDoc(zero, {
        material: 'Wool',
        category: 'DK',
        colour: 'Green',
        quantity: 0,
        unit: 'skeins',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it('denies inventory access outside the owner path', async () => {
    const item = doc(
      environment.authenticatedContext('someone-else', { email_verified: true }).firestore(),
      'users/silvi/inventory/green',
    );
    await assertFails(getDoc(item));
  });
});

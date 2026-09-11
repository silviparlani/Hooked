import { describe, expect, it } from 'vitest';
import { readFirebaseEnvironment } from '@/lib/firebase/environment';

const completeEnvironment = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-hooked.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-hooked',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'app-id',
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'true',
};

describe('readFirebaseEnvironment', () => {
  it('accepts an explicitly isolated emulator project', () => {
    expect(readFirebaseEnvironment(completeEnvironment)).toMatchObject({
      projectId: 'demo-hooked',
      useEmulators: true,
    });
  });

  it('lists missing configuration values', () => {
    expect(() => readFirebaseEnvironment({})).toThrow(
      'Missing Firebase configuration: NEXT_PUBLIC_FIREBASE_API_KEY',
    );
  });

  it('refuses to connect emulator tests to a production-like project', () => {
    expect(() =>
      readFirebaseEnvironment({
        ...completeEnvironment,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'hooked-production',
      }),
    ).toThrow('Firebase emulator mode requires a project ID beginning with "demo-".');
  });
});

export type FirebaseEnvironment = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  useEmulators: boolean;
};

type EnvironmentSource = Partial<Record<keyof NodeJS.ProcessEnv, string | undefined>>;

const requiredKeys = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

export function readFirebaseEnvironment(source: EnvironmentSource): FirebaseEnvironment {
  const useEmulators = source.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
  const missing = requiredKeys.filter((key) => !source[key]?.trim());

  if (missing.length > 0) {
    throw new Error(`Missing Firebase configuration: ${missing.join(', ')}`);
  }

  const projectId = source.NEXT_PUBLIC_FIREBASE_PROJECT_ID!.trim();

  if (useEmulators && !projectId.startsWith('demo-')) {
    throw new Error('Firebase emulator mode requires a project ID beginning with "demo-".');
  }

  return {
    apiKey: source.NEXT_PUBLIC_FIREBASE_API_KEY!.trim(),
    authDomain: source.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!.trim(),
    projectId,
    messagingSenderId: source.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!.trim(),
    appId: source.NEXT_PUBLIC_FIREBASE_APP_ID!.trim(),
    useEmulators,
  };
}

export function getFirebaseEnvironment(): FirebaseEnvironment {
  return readFirebaseEnvironment({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
  });
}

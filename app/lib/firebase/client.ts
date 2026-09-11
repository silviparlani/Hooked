import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseEnvironment } from './environment';

let emulatorsConnected = false;
let firestoreInstance: Firestore | undefined;

export function getFirebaseClient() {
  const environment = getFirebaseEnvironment();
  const app = getApps().length > 0 ? getApp() : initializeApp(environment);
  const auth = getAuth(app);
  const firestore =
    firestoreInstance ??
    (firestoreInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    }));

  if (environment.useEmulators && !emulatorsConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    emulatorsConnected = true;
  }

  return { auth, firestore };
}

export function observeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseClient().auth, callback);
}

export async function signIn(email: string, password: string, keepLoggedIn: boolean) {
  const { auth } = getFirebaseClient();
  await setPersistence(auth, keepLoggedIn ? browserLocalPersistence : browserSessionPersistence);
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function createAccount(email: string, password: string, keepLoggedIn: boolean) {
  const { auth } = getFirebaseClient();
  await setPersistence(auth, keepLoggedIn ? browserLocalPersistence : browserSessionPersistence);
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await sendEmailVerification(credential.user);
  return credential;
}

export async function resendVerification(user: User) {
  await sendEmailVerification(user);
}

export async function refreshUser(user: User) {
  await user.reload();
  return getFirebaseClient().auth.currentUser;
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(getFirebaseClient().auth, email.trim());
}

export async function signOutCurrentUser() {
  await signOut(getFirebaseClient().auth);
}

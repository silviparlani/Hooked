'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { AuthScreen } from './auth-screen';
import {
  observeAuth,
  refreshUser,
  resendVerification,
  signOutCurrentUser,
} from '@/lib/firebase/client';
import { getSafeAuthMessage } from '@/lib/firebase/auth-errors';

export function AuthGate({ children }: { children: ReactNode | ((user: User) => ReactNode) }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [configurationError, setConfigurationError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verificationConfirmed, setVerificationConfirmed] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};

    void Promise.resolve().then(() => {
      try {
        unsubscribe = observeAuth((nextUser) => {
          setUser(nextUser);
          setChecking(false);
        });
      } catch (caughtError) {
        setConfigurationError(
          caughtError instanceof Error ? caughtError.message : 'Firebase is not configured.',
        );
        setChecking(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (checking) {
    return (
      <main className="auth-page">
        <output>Opening Hooked…</output>
      </main>
    );
  }

  if (configurationError) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Setup needed</h1>
          <p role="alert">{configurationError}</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!user.emailVerified && !verificationConfirmed) {
    async function handleRefresh() {
      setError('');
      setMessage('Checking verification…');
      setCheckingVerification(true);

      try {
        const refreshedUser = await refreshUser(user!);
        if (refreshedUser?.emailVerified) {
          setVerificationConfirmed(true);
        } else {
          setMessage('Your email is not verified yet. Open the link in the email, then try again.');
        }
      } catch (caughtError) {
        setMessage('');
        setError(getSafeAuthMessage(caughtError));
      } finally {
        setCheckingVerification(false);
      }
    }

    async function handleResend() {
      setError('');
      try {
        await resendVerification(user!);
        setMessage('A new verification email has been sent.');
      } catch (caughtError) {
        setError(getSafeAuthMessage(caughtError));
      }
    }

    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Check your email</h1>
          <p>We sent a verification link to {user.email}. Open it before continuing.</p>
          {message && <output className="auth-message">{message}</output>}
          {error && (
            <p className="auth-message auth-message--error" role="alert">
              {error}
            </p>
          )}
          <button
            className="auth-primary-action"
            type="button"
            onClick={handleRefresh}
            disabled={checkingVerification}
          >
            {checkingVerification ? 'Checking…' : 'I’ve verified my email'}
          </button>
          <div className="auth-secondary-actions">
            <button type="button" onClick={handleResend}>
              Resend email
            </button>
            <button type="button" onClick={signOutCurrentUser}>
              Use another account
            </button>
          </div>
        </section>
      </main>
    );
  }

  return typeof children === 'function' ? children(user) : children;
}

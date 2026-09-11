'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createAccount, resetPassword, signIn } from '@/lib/firebase/client';
import { getSafeAuthMessage } from '@/lib/firebase/auth-errors';

type AuthMode = 'sign-in' | 'sign-up' | 'reset';

export function AuthScreen({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (mode === 'sign-up' && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);

    try {
      if (mode === 'sign-in') {
        await signIn(email, password, keepLoggedIn);
        onAuthenticated?.();
      } else if (mode === 'sign-up') {
        await createAccount(email, password, keepLoggedIn);
        onAuthenticated?.();
      } else {
        await resetPassword(email);
        setMessage('Check your email for a password-reset link.');
      }
    } catch (caughtError) {
      setError(getSafeAuthMessage(caughtError));
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError('');
    setMessage('');
  }

  const title =
    mode === 'sign-in'
      ? 'Welcome back'
      : mode === 'sign-up'
        ? 'Create your account'
        : 'Reset your password';

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <Image src="/hooked-icon-left-sketch.png" alt="" width={56} height={56} priority />
          <span>Hooked</span>
        </div>

        <h1 id="auth-title">{title}</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {mode !== 'reset' && (
            <label>
              Password
              <input
                type="password"
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          )}

          {mode === 'sign-up' && (
            <label>
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          )}

          {mode !== 'reset' && (
            <label className="auth-checkbox">
              <input
                type="checkbox"
                checked={keepLoggedIn}
                onChange={(event) => setKeepLoggedIn(event.target.checked)}
              />
              Keep me logged in
            </label>
          )}

          {error && (
            <p className="auth-message auth-message--error" role="alert">
              {error}
            </p>
          )}
          {message && <output className="auth-message">{message}</output>}

          <button className="auth-primary-action" type="submit" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'sign-in'
                ? 'Sign in'
                : mode === 'sign-up'
                  ? 'Create account'
                  : 'Send reset link'}
          </button>
        </form>

        <div className="auth-secondary-actions">
          {mode === 'sign-in' && (
            <>
              <button type="button" onClick={() => changeMode('reset')}>
                Forgot password?
              </button>
              <button type="button" onClick={() => changeMode('sign-up')}>
                Create an account
              </button>
            </>
          )}
          {mode !== 'sign-in' && (
            <button type="button" onClick={() => changeMode('sign-in')}>
              Back to sign in
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

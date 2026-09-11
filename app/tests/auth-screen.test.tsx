import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthScreen } from '@/components/auth/auth-screen';
import { createAccount, signIn } from '@/lib/firebase/client';

vi.mock('@/lib/firebase/client', () => ({
  createAccount: vi.fn(),
  resetPassword: vi.fn(),
  signIn: vi.fn(),
}));

describe('AuthScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('signs in with persistent login selected by default', async () => {
    const onAuthenticated = vi.fn();
    render(<AuthScreen onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'silvi@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith('silvi@example.com', 'long-password', true),
    );
    expect(onAuthenticated).toHaveBeenCalledOnce();
  });

  it('stops account creation when password confirmation differs', async () => {
    render(<AuthScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'silvi@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'one-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'other-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The passwords do not match.');
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('does not leave an authentication error visible after a successful retry', async () => {
    vi.mocked(signIn)
      .mockRejectedValueOnce({ code: 'auth/invalid-credential' })
      .mockResolvedValueOnce({} as Awaited<ReturnType<typeof signIn>>);
    render(<AuthScreen />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'silvi@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('incorrect');

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('shows a retryable message when sign-in loses its network connection', async () => {
    vi.mocked(signIn).mockRejectedValueOnce({ code: 'auth/network-request-failed' });
    render(<AuthScreen />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'silvi@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Hooked could not connect. Check your connection and try again.',
    );
  });
});

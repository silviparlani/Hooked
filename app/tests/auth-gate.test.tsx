import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthGate } from '@/components/auth/auth-gate';
import { observeAuth, refreshUser } from '@/lib/firebase/client';

vi.mock('@/lib/firebase/client', () => ({
  observeAuth: vi.fn(),
  refreshUser: vi.fn(),
  resendVerification: vi.fn(),
  signOutCurrentUser: vi.fn(),
}));

describe('AuthGate email verification', () => {
  it('opens the app after Firebase confirms the existing user is verified', async () => {
    const user = { email: 'silvi@example.com', emailVerified: false };
    vi.mocked(observeAuth).mockImplementation((callback) => {
      callback(user as never);
      return vi.fn();
    });
    vi.mocked(refreshUser).mockResolvedValue({ ...user, emailVerified: true } as never);

    render(
      <AuthGate>
        <p>Hooked home</p>
      </AuthGate>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'I’ve verified my email' }));

    expect(await screen.findByText('Hooked home')).toBeInTheDocument();
  });
});

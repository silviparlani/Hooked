import { describe, expect, it } from 'vitest';
import { getSafeAuthMessage } from '@/lib/firebase/auth-errors';

describe('getSafeAuthMessage', () => {
  it('turns known Firebase codes into useful messages', () => {
    expect(getSafeAuthMessage({ code: 'auth/invalid-credential' })).toBe(
      'The email or password is incorrect.',
    );
  });

  it('does not expose an unknown Firebase error message', () => {
    expect(getSafeAuthMessage({ code: 'auth/internal-error', message: 'private diagnostic' })).toBe(
      'Authentication was unsuccessful. Please try again.',
    );
  });
});

const safeMessages: Record<string, string> = {
  'auth/email-already-in-use': 'That email address already has a Hooked account.',
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/network-request-failed': 'Hooked could not connect. Check your connection and try again.',
  'auth/too-many-requests': 'Too many attempts were made. Please wait and try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/weak-password': 'Use a stronger password with at least six characters.',
};

export function getSafeAuthMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code);
    return safeMessages[code] ?? 'Authentication was unsuccessful. Please try again.';
  }

  return 'Authentication was unsuccessful. Please try again.';
}

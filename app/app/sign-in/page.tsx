'use client';

import { AuthScreen } from '@/components/auth/auth-screen';

export default function SignInPage() {
  return <AuthScreen onAuthenticated={() => window.location.assign('/')} />;
}

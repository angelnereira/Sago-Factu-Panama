'use client';

/**
 * Session Provider Component
 *
 * Wraps the app with NextAuth SessionProvider
 */

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}

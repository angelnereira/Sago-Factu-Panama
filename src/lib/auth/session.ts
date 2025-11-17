/**
 * Server-side Auth Utilities
 *
 * Helper functions for authentication in server components
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth-options';
import { redirect } from 'next/navigation';

/**
 * Get current session (server-side)
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Require authentication (server-side)
 * Redirects to login if not authenticated
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  return session;
}

/**
 * Require admin role
 * Redirects to dashboard if not admin
 */
export async function requireAdmin() {
  const session = await requireAuth();

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return session;
}

/**
 * Get current user ID
 */
export async function getCurrentUserId() {
  const session = await getSession();
  return session?.user?.id || null;
}

/**
 * Get current organization ID
 */
export async function getCurrentOrganizationId() {
  const session = await getSession();
  return session?.user?.organizationId || null;
}

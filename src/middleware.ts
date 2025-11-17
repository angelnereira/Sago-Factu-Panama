/**
 * NextAuth Middleware
 *
 * Protects routes that require authentication
 */

export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/invoices/:path*',
    '/settings/:path*',
    '/clients/:path*',
    '/products/:path*',
    '/reports/:path*',
  ],
};

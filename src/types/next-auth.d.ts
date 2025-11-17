/**
 * NextAuth Type Definitions
 *
 * Extends default NextAuth types with custom fields
 */

import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      organizationId: string;
      organization: {
        id: string;
        razonSocial: string;
        ruc: string;
      };
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: string;
    organizationId: string;
    organization: {
      id: string;
      razonSocial: string;
      ruc: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    organizationId: string;
    organization: {
      id: string;
      razonSocial: string;
      ruc: string;
    };
  }
}

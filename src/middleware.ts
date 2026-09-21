import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Middleware edge-safe: solo comprueba el JWT, sin tocar Prisma.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|manifest.json|sw.js|icon.png).*)'],
};

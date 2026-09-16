import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// Configuración "edge-safe": sin adapter de Prisma (Prisma no corre en el
// runtime edge del middleware). Se combina con el adapter en auth.ts para
// las rutas de API y los Server Components, que sí corren en Node.js.
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      authorization: {
        params: {
          // Se pide de entrada el scope de Calendar para poder crear eventos
          // desde tareas sin un segundo consentimiento aparte.
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = request.nextUrl.pathname.startsWith('/login');
      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL('/hoy', request.nextUrl));
        return true;
      }
      return isLoggedIn;
    },
  },
};

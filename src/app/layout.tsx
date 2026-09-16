import type { Metadata } from 'next';
import { auth } from '@/auth';
import { NavBar } from '@/components/NavBar';
import { ThemeScript } from '@/components/ThemeScript';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plan Semanal',
  description: 'Planificación semanal personal: hoy, semana, proyectos y hábitos.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen font-sans antialiased">
        {session?.user ? <NavBar userName={session.user.name} userImage={session.user.image} /> : null}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}

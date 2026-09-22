import type { Metadata } from 'next';
import { auth } from '@/auth';
import { NavBar } from '@/components/NavBar';
import { Footer } from '@/components/Footer';
import { ThemeScript } from '@/components/ThemeScript';
import { ToastProvider } from '@/components/Toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nortvira',
  description: 'Tu asistente de productividad semanal: hoy, semana, proyectos y hábitos.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <ToastProvider>
          {session?.user ? <NavBar userName={session.user.name} userImage={session.user.image} /> : null}
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
          {session?.user ? <Footer /> : null}
        </ToastProvider>
      </body>
    </html>
  );
}

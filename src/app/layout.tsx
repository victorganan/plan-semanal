import type { Metadata, Viewport } from 'next';
import { auth } from '@/auth';
import { NavBar } from '@/components/NavBar';
import { Footer } from '@/components/Footer';
import { ThemeScript } from '@/components/ThemeScript';
import { ToastProvider } from '@/components/Toast';
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker';
import { QuickCapture } from '@/components/QuickCapture';
import { InboxCaptureProvider } from '@/components/InboxCaptureContext';
import { getInboxPendingCount } from '@/lib/page-data';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nortvira',
  description: 'Tu asistente de productividad semanal: hoy, semana, proyectos y hábitos.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const pendingBandeja = session?.user ? await getInboxPendingCount(session.user.id) : 0;

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <RegisterServiceWorker />
        <ToastProvider>
          <InboxCaptureProvider>
            {session?.user ? (
              <NavBar userName={session.user.name} userImage={session.user.image} pendingBandeja={pendingBandeja} />
            ) : null}
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
            {session?.user ? <Footer /> : null}
            {session?.user ? <QuickCapture /> : null}
          </InboxCaptureProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

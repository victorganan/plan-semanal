'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { text } from '@/i18n/es';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{text.globalError.title}</p>
        <p style={{ color: '#666' }}>{text.globalError.body}</p>
      </body>
    </html>
  );
}

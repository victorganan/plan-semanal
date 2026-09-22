'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Algo ha ido mal</p>
        <p style={{ color: '#666' }}>Recarga la página para continuar.</p>
      </body>
    </html>
  );
}

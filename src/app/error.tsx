'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-base-border bg-base-surface p-8 text-center">
      <p className="text-lg font-semibold">Algo ha ido mal</p>
      <p className="text-sm text-base-muted">
        Ha ocurrido un error inesperado. Puedes reintentar o volver más tarde.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Reintentar
      </button>
    </div>
  );
}

'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { text } from '@/i18n/es';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-base-border bg-base-surface p-8 text-center">
      <p className="text-lg font-semibold">{text.errorPage.title}</p>
      <p className="text-sm text-base-muted">{text.errorPage.body}</p>
      <button
        onClick={reset}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        {text.errorPage.retry}
      </button>
    </div>
  );
}

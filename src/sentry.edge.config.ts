import * as Sentry from '@sentry/nextjs';

// Monitorización de errores en el runtime edge (middleware).
// Se activa solo si hay DSN configurado (variable SENTRY_DSN); sin ella, no hace nada.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}

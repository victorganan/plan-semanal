import * as Sentry from '@sentry/nextjs';

// Monitorización de errores en el servidor (rutas API, server components, cron).
// Se activa solo si hay DSN configurado (variable SENTRY_DSN); sin ella, no hace nada.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}

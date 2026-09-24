import Link from 'next/link';
import { text } from '@/i18n/es';

export default function HerramientasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{text.herramientas.title}</h1>
        <p className="text-sm text-base-muted">{text.herramientas.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/herramientas/matriz"
          className="block rounded-card border border-base-border bg-base-surface p-5 transition hover:border-accent"
        >
          <h2 className="text-lg font-semibold">{text.herramientas.matrixTitle}</h2>
          <p className="mt-1 text-sm text-base-muted">{text.herramientas.matrixDescription}</p>
        </Link>

        <Link
          href="/herramientas/pomodoro"
          className="block rounded-card border border-base-border bg-base-surface p-5 transition hover:border-accent"
        >
          <h2 className="text-lg font-semibold">{text.herramientas.pomodoroTitle}</h2>
          <p className="mt-1 text-sm text-base-muted">{text.herramientas.pomodoroDescription}</p>
        </Link>

        <Link
          href="/herramientas/tiempo"
          className="block rounded-card border border-base-border bg-base-surface p-5 transition hover:border-accent"
        >
          <h2 className="text-lg font-semibold">{text.herramientas.timeReportTitle}</h2>
          <p className="mt-1 text-sm text-base-muted">{text.herramientas.timeReportDescription}</p>
        </Link>
      </div>
    </div>
  );
}

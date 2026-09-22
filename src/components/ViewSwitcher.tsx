import Link from 'next/link';
import clsx from 'clsx';
import { currentIsoWeek, todayDayOfWeek } from '@/lib/week';

export function ViewSwitcher({ mode, isoWeek }: { mode: 'day' | 'week'; isoWeek: string }) {
  const dayHref = isoWeek === currentIsoWeek() ? `/dia/${isoWeek}/${todayDayOfWeek()}` : `/dia/${isoWeek}/0`;

  return (
    <div className="flex rounded-full border border-base-border p-0.5 text-sm">
      <Link
        href={dayHref}
        className={clsx('rounded-full px-3 py-1 transition', mode === 'day' ? 'bg-accent text-white' : 'text-base-muted hover:text-base-text')}
      >
        Día
      </Link>
      <Link
        href={`/semana/${isoWeek}`}
        className={clsx('rounded-full px-3 py-1 transition', mode === 'week' ? 'bg-accent text-white' : 'text-base-muted hover:text-base-text')}
      >
        Semana
      </Link>
    </div>
  );
}

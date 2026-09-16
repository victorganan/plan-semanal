'use client';

import Link from 'next/link';
import { addWeeks, currentIsoWeek, formatWeekRange } from '@/lib/week';

export function WeekNav({ isoWeek }: { isoWeek: string }) {
  const prev = addWeeks(isoWeek, -1);
  const next = addWeeks(isoWeek, 1);
  const isCurrent = isoWeek === currentIsoWeek();

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/semana/${prev}`}
        className="rounded-full border border-base-border px-3 py-1.5 text-sm hover:bg-base-border/40"
      >
        ← Anterior
      </Link>
      <div className="text-center">
        <div className="text-sm font-semibold">{isoWeek}</div>
        <div className="text-xs text-base-muted">{formatWeekRange(isoWeek)}</div>
      </div>
      <Link
        href={`/semana/${next}`}
        className="rounded-full border border-base-border px-3 py-1.5 text-sm hover:bg-base-border/40"
      >
        Siguiente →
      </Link>
      {!isCurrent ? (
        <Link
          href={`/semana/${currentIsoWeek()}`}
          className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          Hoy
        </Link>
      ) : null}
    </div>
  );
}

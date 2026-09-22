'use client';

import Link from 'next/link';
import { addWeeks, currentIsoWeek, todayDayOfWeek, dateForDayOfWeek } from '@/lib/week';

function step(isoWeek: string, dayOfWeek: number, delta: number) {
  let dow = dayOfWeek + delta;
  let iso = isoWeek;
  if (dow < 0) {
    iso = addWeeks(isoWeek, -1);
    dow = 6;
  } else if (dow > 6) {
    iso = addWeeks(isoWeek, 1);
    dow = 0;
  }
  return { iso, dow };
}

export function DayNav({ isoWeek, dayOfWeek }: { isoWeek: string; dayOfWeek: number }) {
  const prev = step(isoWeek, dayOfWeek, -1);
  const next = step(isoWeek, dayOfWeek, 1);
  const isCurrentToday = isoWeek === currentIsoWeek() && dayOfWeek === todayDayOfWeek();
  const date = dateForDayOfWeek(isoWeek, dayOfWeek);
  const dateLabel = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/dia/${prev.iso}/${prev.dow}`}
        className="rounded-full border border-base-border px-3 py-1.5 text-sm hover:bg-base-border/40"
      >
        ← Anterior
      </Link>
      <span className="text-sm font-semibold">{dateLabel}</span>
      <Link
        href={`/dia/${next.iso}/${next.dow}`}
        className="rounded-full border border-base-border px-3 py-1.5 text-sm hover:bg-base-border/40"
      >
        Siguiente →
      </Link>
      {!isCurrentToday ? (
        <Link
          href={`/dia/${currentIsoWeek()}/${todayDayOfWeek()}`}
          className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          Hoy
        </Link>
      ) : null}
    </div>
  );
}

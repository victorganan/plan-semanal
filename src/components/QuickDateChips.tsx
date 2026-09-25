'use client';

import { todayLocalString, tomorrowLocalString, nextMondayLocalString } from '@/lib/week';
import { text } from '@/i18n/es';

// Atajos de fecha reutilizados en el asistente de Bandeja, en "Organizadas,
// sin fecha" y en Algún día: siempre en hora local del navegador.
export function QuickDateChips({ onPick }: { onPick: (dateStr: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onPick(todayLocalString())}
        className="rounded-full border border-base-border px-2.5 py-1 text-xs hover:bg-base-border/40"
      >
        {text.quickDate.today}
      </button>
      <button
        type="button"
        onClick={() => onPick(tomorrowLocalString())}
        className="rounded-full border border-base-border px-2.5 py-1 text-xs hover:bg-base-border/40"
      >
        {text.quickDate.tomorrow}
      </button>
      <button
        type="button"
        onClick={() => onPick(nextMondayLocalString())}
        className="rounded-full border border-base-border px-2.5 py-1 text-xs hover:bg-base-border/40"
      >
        {text.quickDate.nextMonday}
      </button>
    </div>
  );
}

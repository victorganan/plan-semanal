'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  digitsOnly,
  formatDraft,
  parseDigitsToTime,
  pad2,
  quarterHourOptionsAround,
  shiftQuarterHour,
} from '@/lib/time-input';

export function nextQuarterHourFromNow(): string {
  const now = new Date();
  const rounded = Math.ceil(now.getMinutes() / 15) * 15;
  const hours = (now.getHours() + (rounded === 60 ? 1 : 0)) % 24;
  const minutes = rounded % 60;
  return `${pad2(hours)}:${pad2(minutes)}`;
}

// Campo de hora escribible con máscara HH:MM (M2 de PENDIENTE: sustituye al
// desplegable nativo de 96 franjas). Acepta "9", "930", "9.30"/"9,30" y
// "14" al escribir (los separadores se descartan igual que si no se
// hubieran tecleado); los minutos se redondean siempre al cuarto de hora.
// Al hacer foco/clic despliega una lista corta de horas en cuartos,
// centrada en el valor ya elegido (o en ahora si está vacío), para elegir
// sin escribir — escribir y elegir de la lista conviven. ↑/↓ siguen
// sumando/restando 15 minutos al valor confirmado.
export function TimeSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) centerRef.current?.scrollIntoView({ block: 'center' });
  }, [open]);

  function commit(nextDraft: string) {
    const normalized = parseDigitsToTime(digitsOnly(nextDraft));
    setDraft(normalized);
    if (normalized !== value) onChange(normalized);
  }

  function pick(next: string) {
    setDraft(next);
    if (next !== value) onChange(next);
    setOpen(false);
  }

  const options = quarterHourOptionsAround(value);

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        inputMode="numeric"
        placeholder="hh:mm"
        value={draft}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => setDraft(formatDraft(digitsOnly(e.target.value)))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit(draft);
            setOpen(false);
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setOpen(false);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const next = shiftQuarterHour(value || '00:00', 15);
            setDraft(next);
            onChange(next);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = shiftQuarterHour(value || '00:00', -15);
            setDraft(next);
            onChange(next);
          }
        }}
        maxLength={5}
        className={className}
      />
      {open ? (
        <ul className="absolute left-0 top-full z-50 mt-1 max-h-48 w-20 overflow-y-auto rounded-lg border border-base-border bg-base-bg py-1 text-sm shadow-lg">
          {options.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                ref={opt === value ? centerRef : undefined}
                // onMouseDown (no onClick): dispara antes del blur del input, que
                // si no cerraría la lista antes de registrar el clic.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(opt);
                }}
                className={clsx(
                  'block w-full px-2 py-1 text-left hover:bg-base-border/40',
                  opt === value && 'bg-accent/10 font-medium text-accent'
                )}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

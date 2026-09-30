'use client';

import { useEffect, useState } from 'react';
import { digitsOnly, formatDraft, parseDigitsToTime, pad2, shiftQuarterHour } from '@/lib/time-input';

export function nextQuarterHourFromNow(): string {
  const now = new Date();
  const rounded = Math.ceil(now.getMinutes() / 15) * 15;
  const hours = (now.getHours() + (rounded === 60 ? 1 : 0)) % 24;
  const minutes = rounded % 60;
  return `${pad2(hours)}:${pad2(minutes)}`;
}

// Campo de hora escribible con máscara HH:MM (sustituye al desplegable de
// 96 franjas, demasiado largo para navegar). Los minutos se redondean
// siempre al cuarto de hora; ↑/↓ suman o restan 15 minutos al valor ya
// confirmado.
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

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit(nextDraft: string) {
    const normalized = parseDigitsToTime(digitsOnly(nextDraft));
    setDraft(normalized);
    if (normalized !== value) onChange(normalized);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="--:--"
      value={draft}
      onChange={(e) => setDraft(formatDraft(digitsOnly(e.target.value)))}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit(draft);
          e.currentTarget.blur();
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
  );
}

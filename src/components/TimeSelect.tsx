'use client';

import { useState } from 'react';

const ALL_SLOTS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

export function nextQuarterHourFromNow(): string {
  const now = new Date();
  const rounded = Math.ceil(now.getMinutes() / 15) * 15;
  const hours = (now.getHours() + (rounded === 60 ? 1 : 0)) % 24;
  const minutes = rounded % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Reordena la lista para que empiece en el próximo cuarto de hora: así al
// abrir el desplegable no hay que bajar entre decenas de horas ya pasadas.
function orderedFromNow(): string[] {
  const start = ALL_SLOTS.indexOf(nextQuarterHourFromNow());
  if (start <= 0) return ALL_SLOTS;
  return [...ALL_SLOTS.slice(start), ...ALL_SLOTS.slice(0, start)];
}

export function TimeSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [options] = useState(orderedFromNow);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">--:--</option>
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

'use client';

import { text } from '@/i18n/es';

const MINUTE_OPTIONS = [0, 15, 30, 45];

export function DurationPicker({
  minutes,
  onChange,
  className,
  maxHours = 12,
}: {
  minutes: number | null;
  onChange: (minutes: number | null) => void;
  className?: string;
  maxHours?: number;
}) {
  const hourOptions = Array.from({ length: maxHours + 1 }, (_, i) => i);
  const hours = minutes ? Math.floor(minutes / 60) : 0;
  const mins = minutes ? minutes % 60 : 0;

  function update(nextHours: number, nextMins: number) {
    const total = nextHours * 60 + nextMins;
    onChange(total > 0 ? total : null);
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <select
          value={hours}
          onChange={(e) => update(Number(e.target.value), mins)}
          className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
          aria-label={text.durationPicker.hoursAriaLabel}
        >
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {h}h
            </option>
          ))}
        </select>
        <select
          value={mins}
          onChange={(e) => update(hours, Number(e.target.value))}
          className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
          aria-label={text.durationPicker.minutesAriaLabel}
        >
          {MINUTE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, '0')}min
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

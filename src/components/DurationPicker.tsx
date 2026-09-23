'use client';

const MINUTE_OPTIONS = [0, 15, 30, 45];
const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => i); // 0-12h

export function DurationPicker({
  minutes,
  onChange,
  className,
}: {
  minutes: number | null;
  onChange: (minutes: number | null) => void;
  className?: string;
}) {
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
          aria-label="Horas"
        >
          {HOUR_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {h}h
            </option>
          ))}
        </select>
        <select
          value={mins}
          onChange={(e) => update(hours, Number(e.target.value))}
          className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
          aria-label="Minutos"
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

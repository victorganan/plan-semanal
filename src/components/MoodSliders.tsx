'use client';

import clsx from 'clsx';

function Scale({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 text-xs text-base-muted">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={clsx(
              'h-8 w-8 rounded-full border text-sm font-medium transition',
              value === n ? 'border-accent bg-accent text-white' : 'border-base-border hover:bg-base-border/40'
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MoodSliders({
  mentalState,
  physicalState,
  onChange,
}: {
  mentalState: number | null;
  physicalState: number | null;
  onChange: (patch: { mentalState?: number; physicalState?: number }) => void;
}) {
  return (
    <div className="flex flex-wrap gap-6">
      <Scale label="Estado mental" value={mentalState} onChange={(v) => onChange({ mentalState: v })} />
      <Scale label="Estado físico" value={physicalState} onChange={(v) => onChange({ physicalState: v })} />
    </div>
  );
}

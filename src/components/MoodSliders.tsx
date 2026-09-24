'use client';

import clsx from 'clsx';
import { text } from '@/i18n/es';

const FACES = ['😞', '🙁', '😐', '🙂', '😄'];
const LABELS = text.moodSliders.faceLabels;

function Scale({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 text-xs text-base-muted">{label}</div>
      <div className="flex gap-1">
        {FACES.map((face, i) => {
          const n = i + 1;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              title={LABELS[i]}
              aria-label={LABELS[i]}
              className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-full border text-lg transition',
                value === n ? 'border-accent bg-accent/10 scale-110' : 'border-transparent hover:bg-base-border/40'
              )}
            >
              {face}
            </button>
          );
        })}
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
      <Scale label={text.moodSliders.mentalState} value={mentalState} onChange={(v) => onChange({ mentalState: v })} />
      <Scale label={text.moodSliders.physicalState} value={physicalState} onChange={(v) => onChange({ physicalState: v })} />
    </div>
  );
}

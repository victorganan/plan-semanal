'use client';

import { text } from '@/i18n/es';

const ENERGY_VALUES = [1, 2, 3, 4, 5] as const;

// Energía del día (1-5): en el Arranque y en el panel Estado.
export function EnergyPicker({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={text.dayStartCard.energyTitle}>
      {ENERGY_VALUES.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={
            value === v
              ? 'rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white'
              : 'rounded-full border border-base-border px-3 py-1.5 text-xs hover:bg-base-border/40'
          }
        >
          {text.dayStartCard.energyLabels[v - 1]}
        </button>
      ))}
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { WeekFull } from '@/types';

function TextField({
  label,
  defaultValue,
  onSave,
  rows = 1,
}: {
  label: string;
  defaultValue: string;
  onSave: (v: string) => void;
  rows?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const Tag = rows > 1 ? 'textarea' : 'input';
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-base-muted">{label}</span>
      <Tag
        value={value}
        rows={rows > 1 ? rows : undefined}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onSave(value)}
        className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}

export function ObjectivesForm({ week, onSave }: { week: WeekFull; onSave: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Objetivos de la semana</h3>
      <div className="space-y-3">
        <TextField label="Objetivo 1" defaultValue={week.objective1 ?? ''} onSave={(v) => onSave({ objective1: v })} />
        <TextField label="Objetivo 2" defaultValue={week.objective2 ?? ''} onSave={(v) => onSave({ objective2: v })} />
        <TextField label="Objetivo 3" defaultValue={week.objective3 ?? ''} onSave={(v) => onSave({ objective3: v })} />
      </div>
    </div>
  );
}

export function MindDumpForm({ week, onSave }: { week: WeekFull; onSave: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Vaciado de mente</h3>
      <TextField label="" defaultValue={week.mindDump ?? ''} onSave={(v) => onSave({ mindDump: v })} rows={5} />
    </div>
  );
}

export function EvaluationForm({ week, onSave }: { week: WeekFull; onSave: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Evaluación de la semana</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Foco próxima semana"
          defaultValue={week.evalNextWeekFocus ?? ''}
          onSave={(v) => onSave({ evalNextWeekFocus: v })}
          rows={3}
        />
        <TextField label="Aplazado" defaultValue={week.evalPostponed ?? ''} onSave={(v) => onSave({ evalPostponed: v })} rows={3} />
        <TextField label="A mejorar" defaultValue={week.evalToImprove ?? ''} onSave={(v) => onSave({ evalToImprove: v })} rows={3} />
        <TextField label="Delegar" defaultValue={week.evalDelegate ?? ''} onSave={(v) => onSave({ evalDelegate: v })} rows={3} />
      </div>
    </div>
  );
}

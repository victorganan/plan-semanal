'use client';

import { useState } from 'react';
import clsx from 'clsx';
import {
  PRESETS,
  presetValue,
  matchingPreset,
  presetLabel,
  describeRecurrence,
} from '@/lib/rrule-helpers';
import type { Preset, RecurrenceValue, RecurrenceFreq } from '@/lib/rrule-helpers';

const WEEKDAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function unitLabel(freq: RecurrenceFreq, n: number): string {
  switch (freq) {
    case 'DAILY':
      return n === 1 ? 'día' : 'días';
    case 'WEEKLY':
      return n === 1 ? 'semana' : 'semanas';
    case 'MONTHLY':
      return n === 1 ? 'mes' : 'meses';
    case 'YEARLY':
      return n === 1 ? 'año' : 'años';
  }
}

function defaultEndDate(referenceDate: Date): string {
  const d = new Date(referenceDate);
  d.setUTCDate(d.getUTCDate() + 90);
  return d.toISOString().slice(0, 10);
}

export function RecurrenceEditor({
  value,
  referenceDate,
  onChange,
}: {
  value: RecurrenceValue | null;
  referenceDate: Date;
  onChange: (value: RecurrenceValue | null) => void;
}) {
  const [preset, setPreset] = useState<Preset>(() => matchingPreset(value, referenceDate));
  const [custom, setCustom] = useState<RecurrenceValue>(
    () => value ?? presetValue('WEEKLY', referenceDate)!
  );

  function handlePresetChange(next: Preset) {
    setPreset(next);
    if (next === 'CUSTOM') {
      const seed = value ?? custom;
      setCustom(seed);
      onChange(seed);
    } else {
      onChange(presetValue(next, referenceDate));
    }
  }

  function updateCustom(patch: Partial<RecurrenceValue>) {
    const next = { ...custom, ...patch };
    setCustom(next);
    onChange(next);
  }

  function toggleWeekday(d: number) {
    const has = custom.byWeekdays.includes(d);
    const next = has ? custom.byWeekdays.filter((x) => x !== d) : [...custom.byWeekdays, d];
    if (next.length === 0) return; // siempre debe quedar al menos un día marcado
    updateCustom({ byWeekdays: next });
  }

  return (
    <div className="space-y-2">
      <select
        value={preset}
        onChange={(e) => handlePresetChange(e.target.value as Preset)}
        className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
      >
        {PRESETS.map((p) => (
          <option key={p} value={p}>
            {presetLabel(p, referenceDate)}
          </option>
        ))}
      </select>

      {preset === 'CUSTOM' ? (
        <div className="space-y-3 rounded-lg border border-base-border bg-base-surface p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs text-base-muted">Repetir cada</span>
            <input
              type="number"
              min={1}
              max={99}
              value={custom.interval}
              onChange={(e) => updateCustom({ interval: Math.max(1, Number(e.target.value) || 1) })}
              className="w-16 rounded-lg border border-base-border bg-base-bg px-2 py-1 text-sm"
            />
            <select
              value={custom.freq}
              onChange={(e) => updateCustom({ freq: e.target.value as RecurrenceFreq })}
              className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-sm"
            >
              {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((f) => (
                <option key={f} value={f}>
                  {unitLabel(f, custom.interval)}
                </option>
              ))}
            </select>
          </div>

          {custom.freq === 'WEEKLY' ? (
            <div>
              <span className="mb-1.5 block text-xs text-base-muted">Se repite el</span>
              <div className="flex gap-1.5">
                {WEEKDAY_INITIALS.map((label, d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleWeekday(d)}
                    className={clsx(
                      'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium transition',
                      custom.byWeekdays.includes(d)
                        ? 'border-accent bg-accent text-white'
                        : 'border-base-border text-base-muted hover:border-accent'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {custom.freq === 'MONTHLY' ? (
            <label className="flex items-start gap-2 text-xs text-base-muted">
              <input
                type="checkbox"
                checked={custom.monthlyByNthWeekday}
                onChange={(e) => updateCustom({ monthlyByNthWeekday: e.target.checked })}
                className="mt-0.5"
              />
              El mismo día de la semana cada mes (en vez del mismo número de día)
            </label>
          ) : null}

          <div>
            <span className="mb-1.5 block text-xs text-base-muted">Termina</span>
            <div className="space-y-1.5 text-xs">
              <label className="flex items-center gap-2">
                <input type="radio" checked={custom.endMode === 'NEVER'} onChange={() => updateCustom({ endMode: 'NEVER' })} />
                Nunca
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={custom.endMode === 'ON_DATE'}
                  onChange={() => updateCustom({ endMode: 'ON_DATE', endDate: custom.endDate ?? defaultEndDate(referenceDate) })}
                />
                El
                <input
                  type="date"
                  value={custom.endDate ?? defaultEndDate(referenceDate)}
                  onChange={(e) => updateCustom({ endMode: 'ON_DATE', endDate: e.target.value })}
                  disabled={custom.endMode !== 'ON_DATE'}
                  className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs disabled:opacity-40"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={custom.endMode === 'AFTER_COUNT'}
                  onChange={() => updateCustom({ endMode: 'AFTER_COUNT', endCount: custom.endCount ?? 13 })}
                />
                Después de
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={custom.endCount ?? 13}
                  onChange={(e) => updateCustom({ endMode: 'AFTER_COUNT', endCount: Math.max(1, Number(e.target.value) || 1) })}
                  disabled={custom.endMode !== 'AFTER_COUNT'}
                  className="w-16 rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs disabled:opacity-40"
                />
                repeticiones
              </label>
            </div>
          </div>
        </div>
      ) : value ? (
        <p className="text-xs text-base-muted">{describeRecurrence(value, referenceDate)}</p>
      ) : null}
    </div>
  );
}

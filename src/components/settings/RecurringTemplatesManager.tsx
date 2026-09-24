'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { RecurrenceEditor } from '@/components/RecurrenceEditor';
import { PRIORITY_LABELS } from '@/types';
import { describeRecurrence, presetValue } from '@/lib/rrule-helpers';
import type { RecurrenceValue } from '@/lib/rrule-helpers';
import type { Area } from '@/types';
// Alias: el estado local de este componente ya usa el nombre `text` para el texto de la plantilla.
import { text as t } from '@/i18n/es';

interface Template {
  id: string;
  dtstart: Date | string;
  area: Area;
  text: string;
  priority: string;
  freq: RecurrenceValue['freq'];
  interval: number;
  byWeekdays: number[];
  monthlyByNthWeekday: boolean;
  endMode: RecurrenceValue['endMode'];
  endDate: Date | string | null;
  endCount: number | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecurringTemplatesManager({ initialTemplates, areas }: { initialTemplates: Template[]; areas: Area[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [text, setText] = useState('');
  const [areaId, setAreaId] = useState(areas[0]?.id ?? '');
  const [priority, setPriority] = useState('MEDIUM');
  const [dtstart, setDtstart] = useState(todayIso());
  const [recurrence, setRecurrence] = useState<RecurrenceValue | null>(() => presetValue('WEEKLY', new Date(`${todayIso()}T00:00:00Z`)));

  async function refresh() {
    setTemplates(await api.get('/api/recurring-templates'));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !areaId || !recurrence) return;
    await api.post('/api/recurring-templates', { ...recurrence, text: text.trim(), areaId, priority, dtstart });
    setText('');
    await refresh();
  }

  async function remove(id: string) {
    await api.delete(`/api/recurring-templates/${id}`);
    await refresh();
  }

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">{t.recurringTemplates.title}</h3>
      <p className="mb-3 text-xs text-base-muted">{t.recurringTemplates.description}</p>
      {areas.length === 0 ? (
        <p className="mb-3 text-xs text-priority-high">{t.recurringTemplates.needsArea}</p>
      ) : null}
      <ul className="space-y-2">
        {templates.map((tpl) => (
          <li key={tpl.id} className="flex items-center justify-between gap-3 rounded-lg border border-base-border px-3 py-2 text-sm">
            <span>
              {tpl.area.name} · {tpl.text} ·{' '}
              {describeRecurrence(
                {
                  freq: tpl.freq,
                  interval: tpl.interval,
                  byWeekdays: tpl.byWeekdays,
                  monthlyByNthWeekday: tpl.monthlyByNthWeekday,
                  endMode: tpl.endMode,
                  endDate: tpl.endDate ? new Date(tpl.endDate).toISOString().slice(0, 10) : null,
                  endCount: tpl.endCount,
                },
                new Date(tpl.dtstart)
              )}
            </span>
            <button onClick={() => remove(tpl.id)} className="shrink-0 text-xs text-priority-high hover:underline">
              {t.recurringTemplates.deleteButton}
            </button>
          </li>
        ))}
        {templates.length === 0 ? <p className="text-sm text-base-muted">{t.recurringTemplates.empty}</p> : null}
      </ul>

      <form onSubmit={add} className="mt-4 space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
          >
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.recurringTemplates.textPlaceholder}
          className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
        />
        <label className="block">
          <span className="mb-1 block text-xs text-base-muted">{t.recurringTemplates.firstDateLabel}</span>
          <input
            type="date"
            value={dtstart}
            onChange={(e) => {
              setDtstart(e.target.value);
              setRecurrence(presetValue('WEEKLY', new Date(`${e.target.value}T00:00:00Z`)));
            }}
            className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
          />
        </label>
        <RecurrenceEditor key={dtstart} value={recurrence} referenceDate={new Date(`${dtstart}T00:00:00Z`)} onChange={setRecurrence} />
        <button
          type="submit"
          disabled={areas.length === 0 || !recurrence}
          className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {t.recurringTemplates.addButton}
        </button>
      </form>
    </div>
  );
}

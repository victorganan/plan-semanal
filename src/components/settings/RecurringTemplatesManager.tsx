'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { PRIORITY_LABELS, RECURRENCE_LABELS } from '@/types';
import type { Area } from '@/types';
import { DAY_NAMES, currentIsoWeek } from '@/lib/week';

interface Template {
  id: string;
  dayOfWeek: number;
  area: Area;
  text: string;
  priority: string;
  recurrence: string;
  startIsoWeek: string;
}

export function RecurringTemplatesManager({ initialTemplates, areas }: { initialTemplates: Template[]; areas: Area[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [form, setForm] = useState({
    dayOfWeek: 0,
    areaId: areas[0]?.id ?? '',
    text: '',
    priority: 'MEDIUM',
    recurrence: 'WEEKLY',
  });

  async function refresh() {
    setTemplates(await api.get('/api/recurring-templates'));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.text.trim() || !form.areaId) return;
    await api.post('/api/recurring-templates', { ...form, text: form.text.trim(), startIsoWeek: currentIsoWeek() });
    setForm((f) => ({ ...f, text: '' }));
    await refresh();
  }

  async function remove(id: string) {
    await api.delete(`/api/recurring-templates/${id}`);
    await refresh();
  }

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Tareas recurrentes</h3>
      <p className="mb-3 text-xs text-base-muted">
        Se generan automáticamente en cada semana que corresponda, sin duplicarse, desde la semana actual en adelante.
      </p>
      {areas.length === 0 ? (
        <p className="mb-3 text-xs text-priority-high">Crea al menos un área en Tu espacio antes de añadir plantillas.</p>
      ) : null}
      <ul className="space-y-2">
        {templates.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-lg border border-base-border px-3 py-2 text-sm">
            <span>
              {DAY_NAMES[t.dayOfWeek]} · {t.area.name} · {t.text} · {RECURRENCE_LABELS[t.recurrence]}
            </span>
            <button onClick={() => remove(t.id)} className="text-xs text-priority-high hover:underline">
              Eliminar
            </button>
          </li>
        ))}
        {templates.length === 0 ? <p className="text-sm text-base-muted">Sin plantillas todavía.</p> : null}
      </ul>

      <form onSubmit={add} className="mt-4 grid gap-2 sm:grid-cols-2">
        <select
          value={form.dayOfWeek}
          onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
          className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
        >
          {DAY_NAMES.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={form.areaId}
          onChange={(e) => setForm((f) => ({ ...f, areaId: e.target.value }))}
          className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
        >
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          value={form.text}
          onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
          placeholder="Texto de la tarea"
          className="sm:col-span-2 rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
        />
        <select
          value={form.priority}
          onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
          className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
        >
          {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={form.recurrence}
          onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))}
          className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
        >
          {(['WEEKLY', 'BIWEEKLY', 'FOUR_WEEKLY'] as const).map((v) => (
            <option key={v} value={v}>
              {RECURRENCE_LABELS[v]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={areas.length === 0}
          className="sm:col-span-2 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Añadir plantilla
        </button>
      </form>
    </div>
  );
}

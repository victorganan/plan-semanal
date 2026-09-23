'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { PriorityDot } from '@/components/PriorityDot';
import { TimeSelect } from '@/components/TimeSelect';
import { DURATION_LABELS, PRIORITY_LABELS, RECURRENCE_LABELS } from '@/types';
import { DAY_NAMES, isoWeekOf, mondayBasedDayOfWeek } from '@/lib/week';
import type { Area, Project, TaskWithProject } from '@/types';

interface Props {
  task: TaskWithProject;
  projects: Project[];
  areas?: Area[];
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onExportTodoist?: (id: string) => Promise<void>;
  onCreateCalendarEvent?: (id: string) => Promise<void>;
  showRecurrence?: boolean;
  currentIsoWeek?: string;
}

function splitScheduled(scheduledAt: Date | string | null) {
  if (!scheduledAt) return { date: '', time: '' };
  const d = new Date(scheduledAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function TaskCard({
  task,
  projects,
  areas = [],
  onUpdate,
  onDelete,
  onExportTodoist,
  onCreateCalendarEvent,
  showRecurrence,
  currentIsoWeek,
}: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(task.text);
  const [busy, setBusy] = useState(false);
  const initialSplit = splitScheduled(task.scheduledAt);
  const [date, setDate] = useState(initialSplit.date);
  const [time, setTime] = useState(initialSplit.time);
  const [moveDay, setMoveDay] = useState(0);
  const [moveArea, setMoveArea] = useState(areas[0]?.id ?? '');

  async function saveText() {
    if (text.trim() && text !== task.text) await onUpdate(task.id, { text: text.trim() });
  }

  async function toggleDone() {
    setBusy(true);
    await onUpdate(task.id, { done: !task.done });
    setBusy(false);
  }

  async function saveSchedule(nextDate: string, nextTime: string) {
    if (nextDate && nextTime) {
      const dt = new Date(`${nextDate}T${nextTime}`);
      const patch: Record<string, unknown> = { scheduledAt: dt.toISOString() };
      // Si la tarea es de día y la nueva fecha cae en la semana que se está viendo,
      // la tarea se mueve automáticamente al día correspondiente.
      if (task.kind === 'DAY_AREA' && currentIsoWeek && isoWeekOf(dt) === currentIsoWeek) {
        patch.isoWeek = currentIsoWeek;
        patch.dayOfWeek = mondayBasedDayOfWeek(dt);
      }
      await onUpdate(task.id, patch);
    } else if (!nextDate && !nextTime && task.scheduledAt) {
      await onUpdate(task.id, { scheduledAt: null });
    }
  }

  const scheduledLabel = task.scheduledAt
    ? new Date(task.scheduledAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      draggable={task.kind === 'DAY_AREA'}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={clsx(
        'rounded-card border border-base-border bg-base-surface transition',
        task.done && 'opacity-60',
        task.kind === 'DAY_AREA' && 'cursor-grab active:cursor-grabbing'
      )}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <button
          onClick={toggleDone}
          disabled={busy}
          aria-label={task.done ? 'Marcar como pendiente' : 'Marcar como hecha'}
          className={clsx(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs transition',
            task.done ? 'border-accent bg-accent text-white' : 'border-base-border text-transparent hover:border-accent'
          )}
        >
          ✓
        </button>

        <div className="min-w-0 flex-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={saveText}
            className={clsx(
              'w-full truncate bg-transparent text-sm leading-snug outline-none',
              task.done && 'line-through'
            )}
          />
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-base-muted">
            <span className="inline-flex items-center gap-1">
              <PriorityDot priority={task.priority} /> {PRIORITY_LABELS[task.priority]}
            </span>
            {task.duration ? <span>· {DURATION_LABELS[task.duration]}</span> : null}
            {task.project ? (
              <span className="rounded-full bg-base-border/50 px-2 py-0.5">{task.project.name}</span>
            ) : null}
            {scheduledLabel ? <span>📅 {scheduledLabel}</span> : null}
            {showRecurrence && task.recurrence !== 'NONE' ? <span>🔁 {RECURRENCE_LABELS[task.recurrence]}</span> : null}
          </div>

          {task.kind === 'BACKLOG' && currentIsoWeek ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <select
                value={moveDay}
                onChange={(e) => setMoveDay(Number(e.target.value))}
                className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs"
              >
                {DAY_NAMES.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={moveArea}
                onChange={(e) => setMoveArea(e.target.value)}
                className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  onUpdate(task.id, { kind: 'DAY_AREA', isoWeek: currentIsoWeek, dayOfWeek: moveDay, areaId: moveArea })
                }
                disabled={!moveArea}
                className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
              >
                Mover a esta semana →
              </button>
            </div>
          ) : null}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Editar tarea"
          className="shrink-0 rounded-full p-1.5 text-base-muted transition hover:bg-base-border/40 hover:text-base-text"
        >
          ✏️
        </button>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-base-border px-3 py-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="block text-xs text-base-muted">Prioridad</span>
              <select
                value={task.priority}
                onChange={(e) => onUpdate(task.id, { priority: e.target.value })}
                className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
              >
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-base-muted">Duración</span>
              <select
                value={task.duration ?? ''}
                onChange={(e) => onUpdate(task.id, { duration: e.target.value || null })}
                className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
              >
                <option value="">Sin definir</option>
                {Object.entries(DURATION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-base-muted">Proyecto</span>
              <select
                value={task.projectId ?? ''}
                onChange={(e) => onUpdate(task.id, { projectId: e.target.value || null })}
                className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
              >
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-1">
              <span className="block text-xs text-base-muted">Fecha y hora</span>
              <div className="flex gap-1">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    saveSchedule(e.target.value, time);
                  }}
                  className="w-full min-w-0 rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
                />
                <TimeSelect
                  value={time}
                  onChange={(v) => {
                    setTime(v);
                    saveSchedule(date, v);
                  }}
                  className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            {task.kind === 'DAY_AREA' ? (
              <label className="col-span-2 space-y-1">
                <span className="block text-xs text-base-muted">Recurrencia</span>
                <select
                  value={task.recurrence}
                  onChange={(e) => onUpdate(task.id, { recurrence: e.target.value })}
                  className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
                >
                  {Object.entries(RECURRENCE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {onCreateCalendarEvent && task.scheduledAt ? (
              <button
                onClick={() => onCreateCalendarEvent(task.id)}
                className="rounded-full border border-base-border px-3 py-1 text-xs font-medium hover:bg-base-border/40"
              >
                Crear evento en Calendar
              </button>
            ) : null}
            {onExportTodoist ? (
              <button
                onClick={() => onExportTodoist(task.id)}
                className="rounded-full border border-base-border px-3 py-1 text-xs font-medium hover:bg-base-border/40"
              >
                Exportar a Todoist
              </button>
            ) : null}
            <button
              onClick={() => onDelete(task.id)}
              className="rounded-full px-3 py-1 text-xs font-medium text-priority-high hover:bg-priority-high/10"
            >
              Eliminar
            </button>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

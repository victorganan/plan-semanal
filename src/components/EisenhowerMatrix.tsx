'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { TimeSelect, nextQuarterHourFromNow } from '@/components/TimeSelect';
import { EISENHOWER_QUADRANTS, EISENHOWER_LABELS, EISENHOWER_HINTS } from '@/types';
import type { EisenhowerQuadrantValue } from '@/types';
import type { ProjectWithAreaAndCollaborators, TaskWithProject } from '@/types';

interface Props {
  tasks: TaskWithProject[];
  projects: ProjectWithAreaAndCollaborators[];
  calendarConnected: boolean;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateCalendarEvent?: (id: string) => Promise<void>;
  defaultOpen?: boolean;
}

function todayDateString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function timeFromScheduledAt(scheduledAt: Date | string | null): string {
  if (!scheduledAt) return '';
  const d = new Date(scheduledAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const QUADRANT_STYLES: Record<EisenhowerQuadrantValue, string> = {
  HACER: 'border-priority-high/40 bg-priority-high/5',
  DECIDIR: 'border-accent/40 bg-accent/5',
  DELEGAR: 'border-amber-400/40 bg-amber-400/5',
  ALGUN_DIA: 'border-base-border bg-base-bg/50',
};

export function EisenhowerMatrix({ tasks, projects, calendarConnected, onUpdate, onDelete, onCreateCalendarEvent, defaultOpen }: Props) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [dragOverQuadrant, setDragOverQuadrant] = useState<EisenhowerQuadrantValue | null>(null);
  const [actionFor, setActionFor] = useState<{ taskId: string; quadrant: EisenhowerQuadrantValue } | null>(null);
  const [decideDate, setDecideDate] = useState('');
  const [decideTime, setDecideTime] = useState('');
  const [delegateTo, setDelegateTo] = useState('');

  const relevant = tasks.filter((t) => t.kind !== 'BACKLOG' && !t.done);
  const unclassified = relevant.filter((t) => !t.quadrant);
  const byQuadrant = (q: EisenhowerQuadrantValue) => relevant.filter((t) => t.quadrant === q);

  function collaboratorsFor(task: TaskWithProject): string[] {
    const fromProject = task.project?.collaborators ?? [];
    const all = fromProject.length > 0 ? fromProject : projects.flatMap((p) => p.collaborators);
    return Array.from(new Set(all.map((c) => c.name)));
  }

  async function classify(task: TaskWithProject, quadrant: EisenhowerQuadrantValue) {
    if (quadrant === 'HACER') {
      const time = timeFromScheduledAt(task.scheduledAt) || nextQuarterHourFromNow();
      const scheduledAt = new Date(`${todayDateString()}T${time}`).toISOString();
      await onUpdate(task.id, { quadrant, scheduledAt });
      if (calendarConnected && onCreateCalendarEvent) await onCreateCalendarEvent(task.id);
      setActionFor(null);
      return;
    }
    if (quadrant === 'DECIDIR') {
      setDecideDate(todayDateString());
      setDecideTime(timeFromScheduledAt(task.scheduledAt) || '');
      setActionFor({ taskId: task.id, quadrant });
      await onUpdate(task.id, { quadrant });
      return;
    }
    if (quadrant === 'DELEGAR') {
      const suggestions = collaboratorsFor(task);
      setDelegateTo(task.assignedTo ?? suggestions[0] ?? '');
      setActionFor({ taskId: task.id, quadrant });
      await onUpdate(task.id, { quadrant });
      return;
    }
    // ALGUN_DIA
    setActionFor({ taskId: task.id, quadrant });
    await onUpdate(task.id, { quadrant });
  }

  async function confirmDecidir(task: TaskWithProject) {
    if (!decideDate || !decideTime) return;
    const scheduledAt = new Date(`${decideDate}T${decideTime}`).toISOString();
    await onUpdate(task.id, { scheduledAt });
    setActionFor(null);
  }

  async function confirmDelegar(task: TaskWithProject) {
    if (!delegateTo.trim()) return;
    await onUpdate(task.id, { assignedTo: delegateTo.trim() });
    setActionFor(null);
  }

  async function postpone(task: TaskWithProject) {
    await onUpdate(task.id, { kind: 'BACKLOG' });
    setActionFor(null);
  }

  async function discard(task: TaskWithProject) {
    await onDelete(task.id);
    setActionFor(null);
  }

  function unclassify(task: TaskWithProject) {
    setActionFor(null);
    onUpdate(task.id, { quadrant: null });
  }

  function TaskChip({ task, quadrant }: { task: TaskWithProject; quadrant?: EisenhowerQuadrantValue }) {
    const suggestions = collaboratorsFor(task);
    const listId = `matrix-delegate-${task.id}`;
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', task.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        className="cursor-grab space-y-1.5 rounded-lg bg-base-surface p-2 text-xs shadow-sm active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="truncate">{task.text}</span>
          {quadrant ? (
            <button
              onClick={() => unclassify(task)}
              aria-label="Quitar de la matriz"
              className="shrink-0 text-base-muted hover:text-priority-high"
            >
              ✕
            </button>
          ) : null}
        </div>

        {!quadrant ? (
          <div className="flex flex-wrap gap-1">
            {EISENHOWER_QUADRANTS.map((q) => (
              <button
                key={q}
                onClick={() => classify(task, q)}
                className="rounded-full border border-base-border px-2 py-0.5 text-[10px] hover:bg-base-border/40"
              >
                {EISENHOWER_LABELS[q]}
              </button>
            ))}
          </div>
        ) : null}

        {actionFor?.taskId === task.id && actionFor.quadrant === 'DECIDIR' ? (
          <div className="space-y-1.5 border-t border-base-border pt-1.5">
            <div className="flex gap-1">
              <input
                type="date"
                value={decideDate}
                onChange={(e) => setDecideDate(e.target.value)}
                className="w-full min-w-0 rounded border border-base-border bg-base-bg px-1.5 py-1 text-[11px]"
              />
              <TimeSelect value={decideTime} onChange={setDecideTime} className="rounded border border-base-border bg-base-bg px-1.5 py-1 text-[11px]" />
            </div>
            <button
              onClick={() => confirmDecidir(task)}
              disabled={!decideDate || !decideTime}
              className="w-full rounded-full bg-accent px-2 py-1 text-[11px] font-medium text-white disabled:opacity-40"
            >
              Guardar fecha
            </button>
          </div>
        ) : null}

        {actionFor?.taskId === task.id && actionFor.quadrant === 'DELEGAR' ? (
          <div className="space-y-1.5 border-t border-base-border pt-1.5">
            <input
              value={delegateTo}
              onChange={(e) => setDelegateTo(e.target.value)}
              placeholder="Nombre de la persona"
              list={listId}
              className="w-full rounded border border-base-border bg-base-bg px-1.5 py-1 text-[11px]"
            />
            {suggestions.length > 0 ? (
              <datalist id={listId}>
                {suggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            ) : null}
            <button
              onClick={() => confirmDelegar(task)}
              disabled={!delegateTo.trim()}
              className="w-full rounded-full bg-accent px-2 py-1 text-[11px] font-medium text-white disabled:opacity-40"
            >
              Asignar
            </button>
          </div>
        ) : null}

        {actionFor?.taskId === task.id && actionFor.quadrant === 'ALGUN_DIA' ? (
          <div className="flex gap-1 border-t border-base-border pt-1.5">
            <button
              onClick={() => postpone(task)}
              className="flex-1 rounded-full border border-base-border px-2 py-1 text-[11px] hover:bg-base-border/40"
            >
              Aplazar
            </button>
            <button
              onClick={() => discard(task)}
              className="flex-1 rounded-full px-2 py-1 text-[11px] text-priority-high hover:bg-priority-high/10"
            >
              Descartar
            </button>
          </div>
        ) : null}

        {quadrant && task.assignedTo ? <p className="text-[10px] text-base-muted">👤 {task.assignedTo}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold">
        Matriz de Eisenhower
        <span className="text-base-muted">{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {EISENHOWER_QUADRANTS.map((q) => (
              <div
                key={q}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverQuadrant(q);
                }}
                onDragLeave={() => setDragOverQuadrant((v) => (v === q ? null : v))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverQuadrant(null);
                  const taskId = e.dataTransfer.getData('text/plain');
                  const task = relevant.find((t) => t.id === taskId);
                  if (task) classify(task, q);
                }}
                className={clsx(
                  'min-h-[6rem] rounded-lg border p-2 transition',
                  QUADRANT_STYLES[q],
                  dragOverQuadrant === q && 'ring-2 ring-accent'
                )}
              >
                <p className="mb-1.5 text-xs font-semibold text-base-text">{EISENHOWER_LABELS[q]}</p>
                <p className="mb-2 text-[10px] text-base-muted">{EISENHOWER_HINTS[q]}</p>
                <div className="space-y-1.5">
                  {byQuadrant(q).map((t) => (
                    <TaskChip key={t.id} task={t} quadrant={q} />
                  ))}
                  {byQuadrant(q).length === 0 ? <span className="text-[11px] text-base-muted">—</span> : null}
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-base-muted">Sin clasificar</p>
            <div className="space-y-1.5">
              {unclassified.map((t) => (
                <TaskChip key={t.id} task={t} />
              ))}
              {unclassified.length === 0 ? (
                <p className="text-xs text-base-muted">Todo clasificado. Bien hecho.</p>
              ) : null}
            </div>
          </div>

          <p className="text-xs text-base-muted">
            Arrastra una tarea a un cuadrante o usa sus botones. <strong>Hacer</strong> la agenda para hoy,{' '}
            <strong>Decidir</strong> pide fecha y hora, <strong>Delegar</strong> pide a quién asignarla, y{' '}
            <strong>Algún día</strong> deja aplazarla o descartarla.
          </p>
        </div>
      ) : null}
    </div>
  );
}

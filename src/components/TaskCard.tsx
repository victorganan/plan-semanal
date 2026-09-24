'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { PriorityDot } from '@/components/PriorityDot';
import { TimeSelect } from '@/components/TimeSelect';
import { DurationPicker } from '@/components/DurationPicker';
import { AddTaskInline } from '@/components/AddTaskInline';
import { RecurrenceEditor } from '@/components/RecurrenceEditor';
import { api } from '@/lib/api-client';
import { PRIORITY_LABELS, RECURRENCE_LABELS, formatDurationMinutes, areaBgClass } from '@/types';
import { describeRecurrence } from '@/lib/rrule-helpers';
import type { RecurrenceValue } from '@/lib/rrule-helpers';
import { DAY_NAMES, isoWeekOf, mondayBasedDayOfWeek } from '@/lib/week';
import type { Area, ProjectWithAreaAndCollaborators, Task, TaskWithProject, RecurringTaskTemplate, Tag } from '@/types';
// Alias: el estado local de este componente ya usa el nombre `text` para el título de la tarea.
import { text as t } from '@/i18n/es';

interface Props {
  task: TaskWithProject;
  projects: ProjectWithAreaAndCollaborators[];
  areas?: Area[];
  tags?: Tag[];
  referenceDate?: Date;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onExportTodoist?: (id: string) => Promise<void>;
  onCreateCalendarEvent?: (id: string) => Promise<void>;
  showRecurrence?: boolean;
  currentIsoWeek?: string;
}

function templateToValue(t: RecurringTaskTemplate): RecurrenceValue {
  return {
    freq: t.freq,
    interval: t.interval,
    byWeekdays: t.byWeekdays,
    monthlyByNthWeekday: t.monthlyByNthWeekday,
    endMode: t.endMode,
    endDate: t.endDate ? t.endDate.toISOString().slice(0, 10) : null,
    endCount: t.endCount,
  };
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
  tags = [],
  referenceDate,
  onUpdate,
  onDelete,
  onExportTodoist,
  onCreateCalendarEvent,
  showRecurrence,
  currentIsoWeek,
}: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(task.text);
  const [description, setDescription] = useState(task.description ?? '');
  const [assignedTo, setAssignedTo] = useState(task.assignedTo ?? '');
  const [newTagName, setNewTagName] = useState('');
  const [busy, setBusy] = useState(false);
  const initialSplit = splitScheduled(task.scheduledAt);
  const [date, setDate] = useState(initialSplit.date);
  const [time, setTime] = useState(initialSplit.time);
  const [moveDay, setMoveDay] = useState(0);
  const [moveArea, setMoveArea] = useState(areas[0]?.id ?? '');
  const [subtasks, setSubtasks] = useState<Task[]>(task.subtasks);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [recurrenceBusy, setRecurrenceBusy] = useState(false);
  const [recurrenceValue, setRecurrenceValue] = useState<RecurrenceValue | null>(() =>
    task.recurringTemplate ? templateToValue(task.recurringTemplate) : null
  );

  // Cronómetro manual de tiempo ejecutado, desde la propia ficha de la tarea.
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchAccumulatedSec, setStopwatchAccumulatedSec] = useState(0);
  const [, forceTick] = useState(0);
  const stopwatchStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stopwatchRunning) return;
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [stopwatchRunning]);

  const stopwatchElapsedSec =
    stopwatchAccumulatedSec + (stopwatchRunning && stopwatchStartRef.current ? Math.floor((Date.now() - stopwatchStartRef.current) / 1000) : 0);

  function formatElapsed(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  function startStopwatch() {
    stopwatchStartRef.current = Date.now();
    setStopwatchRunning(true);
  }

  function pauseStopwatch() {
    if (stopwatchStartRef.current) {
      setStopwatchAccumulatedSec((s) => s + Math.floor((Date.now() - stopwatchStartRef.current!) / 1000));
    }
    stopwatchStartRef.current = null;
    setStopwatchRunning(false);
  }

  async function stopStopwatch() {
    const totalSec = stopwatchElapsedSec;
    stopwatchStartRef.current = null;
    setStopwatchRunning(false);
    setStopwatchAccumulatedSec(0);
    const minutes = Math.round(totalSec / 60);
    await onUpdate(task.id, minutes > 0 ? { executedMinutes: task.executedMinutes + minutes, done: true } : { done: true });
  }

  async function saveRecurrence(v: RecurrenceValue | null) {
    setRecurrenceBusy(true);
    try {
      const updated = await api.patch(`/api/tasks/${task.id}/recurrence`, { value: v });
      setRecurrenceValue(v);
      setRecurrenceOpen(false);
      await onUpdate(task.id, { recurrence: updated.recurrence });
    } finally {
      setRecurrenceBusy(false);
    }
  }

  async function toggleSubtask(sub: Task) {
    const next = !sub.done;
    setSubtasks((prev) => prev.map((s) => (s.id === sub.id ? { ...s, done: next } : s)));
    await api.patch(`/api/tasks/${sub.id}`, { done: next });
    const allDone = subtasks.every((s) => (s.id === sub.id ? next : s.done));
    await onUpdate(task.id, { done: allDone });
  }

  async function addSubtask(text: string) {
    const created = await api.post('/api/tasks', { kind: 'BACKLOG', text, parentTaskId: task.id });
    setSubtasks((prev) => [...prev, created]);
    if (task.done) await onUpdate(task.id, { done: false });
  }

  async function deleteSubtask(sub: Task) {
    setSubtasks((prev) => prev.filter((s) => s.id !== sub.id));
    await api.delete(`/api/tasks/${sub.id}`);
  }

  async function saveText() {
    if (text.trim() && text !== task.text) await onUpdate(task.id, { text: text.trim() });
  }

  async function saveAssignedTo() {
    const next = assignedTo.trim() || null;
    if (next !== (task.assignedTo ?? null)) await onUpdate(task.id, { assignedTo: next });
  }

  async function saveDescription() {
    const next = description.trim() || null;
    if (next !== (task.description ?? null)) await onUpdate(task.id, { description: next });
  }

  async function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setNewTagName('');
    const existing = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    const tag: Tag = existing ?? (await api.post('/api/tags', { name: trimmed }));
    if (task.tags.some((t) => t.id === tag.id)) return;
    const nextTags = [...task.tags, tag];
    await onUpdate(task.id, { tagIds: nextTags.map((t) => t.id), tags: nextTags });
  }

  async function removeTag(tagId: string) {
    const nextTags = task.tags.filter((t) => t.id !== tagId);
    await onUpdate(task.id, { tagIds: nextTags.map((t) => t.id), tags: nextTags });
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

  const currentProject = projects.find((p) => p.id === task.projectId);
  const collaboratorSuggestions = Array.from(
    new Set((currentProject?.collaborators ?? projects.flatMap((p) => p.collaborators)).map((c) => c.name))
  );
  const assignedToListId = `assigned-to-${task.id}`;

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
          aria-label={t.taskCard.toggleDoneAriaLabel(task.done)}
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
            {task.durationMinutes ? <span>· {formatDurationMinutes(task.durationMinutes)}</span> : null}
            {task.executedMinutes > 0 ? <span>⏱ {formatDurationMinutes(task.executedMinutes)} {t.taskCard.executedSuffix}</span> : null}
            {task.description ? <span title={task.description}>📝</span> : null}
            {task.project ? (
              <span className="rounded-full bg-base-border/50 px-2 py-0.5">{task.project.name}</span>
            ) : null}
            {scheduledLabel ? <span>📅 {scheduledLabel}</span> : null}
            {task.assignedTo ? <span>👤 {task.assignedTo}</span> : null}
            {task.tags.map((t) => (
              <span key={t.id} className={clsx('rounded-full px-2 py-0.5 text-white', areaBgClass(t.colorIndex))}>
                #{t.name}
              </span>
            ))}
            {showRecurrence && task.recurrence !== 'NONE' ? <span>🔁 {RECURRENCE_LABELS[task.recurrence]}</span> : null}
            {task.parentTaskId ? <span>↳ subtarea</span> : null}
            {subtasks.length > 0 ? (
              <span>
                ☑️ {subtasks.filter((s) => s.done).length}/{subtasks.length}
              </span>
            ) : null}
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
                {t.taskCard.moveToWeek}
              </button>
            </div>
          ) : null}
        </div>

        {task.kind === 'DAY_AREA' ? (
          <button
            onClick={() => onUpdate(task.id, { isTop3: !task.isTop3 })}
            aria-label={t.taskCard.top3AriaLabel(task.isTop3)}
            title={t.taskCard.top3AriaLabel(task.isTop3)}
            className={clsx(
              'shrink-0 rounded-full p-1.5 transition hover:bg-base-border/40',
              task.isTop3 ? 'text-amber-500' : 'text-base-muted/50 hover:text-base-muted'
            )}
          >
            {task.isTop3 ? '⭐' : '☆'}
          </button>
        ) : null}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={t.taskCard.editAriaLabel}
          className="shrink-0 rounded-full p-1.5 text-base-muted transition hover:bg-base-border/40 hover:text-base-text"
        >
          ✏️
        </button>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-base-border px-3 py-3 text-sm">
          <label className="block space-y-1">
            <span className="block text-xs text-base-muted">{t.taskCard.description}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              rows={3}
              placeholder={t.taskCard.descriptionPlaceholder}
              className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="block text-xs text-base-muted">{t.taskCard.priority}</span>
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
              <span className="block text-xs text-base-muted">{t.taskCard.estimatedDuration}</span>
              <DurationPicker
                minutes={task.durationMinutes}
                onChange={(durationMinutes) => onUpdate(task.id, { durationMinutes })}
              />
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-base-muted">{t.taskCard.project}</span>
              <select
                value={task.projectId ?? ''}
                onChange={(e) => onUpdate(task.id, { projectId: e.target.value || null })}
                className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
              >
                <option value="">{t.taskCard.noProject}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-base-muted">{t.taskCard.assignedTo}</span>
              <input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                onBlur={saveAssignedTo}
                placeholder={t.taskCard.assignedToPlaceholder}
                list={assignedToListId}
                className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
              />
              {collaboratorSuggestions.length > 0 ? (
                <datalist id={assignedToListId}>
                  {collaboratorSuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              ) : null}
            </label>
            <div className="space-y-1">
              <span className="block text-xs text-base-muted">{t.taskCard.dateAndTime}</span>
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
          </div>

          <div className="space-y-2 border-t border-base-border pt-3">
            <span className="block text-xs text-base-muted">{t.taskCard.executedTime}</span>
            <div className="flex flex-wrap items-center gap-2">
              <DurationPicker
                minutes={task.executedMinutes}
                maxHours={48}
                onChange={(executedMinutes) => onUpdate(task.id, { executedMinutes: executedMinutes ?? 0 })}
              />
              {stopwatchRunning || stopwatchAccumulatedSec > 0 ? (
                <span className="tabular-nums text-xs text-base-muted">⏱ {formatElapsed(stopwatchElapsedSec)}</span>
              ) : null}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={startStopwatch}
                  disabled={stopwatchRunning}
                  className="rounded-full border border-base-border px-2.5 py-1 text-xs font-medium hover:bg-base-border/40 disabled:opacity-40"
                >
                  {t.taskCard.recordButton}
                </button>
                <button
                  type="button"
                  onClick={pauseStopwatch}
                  disabled={!stopwatchRunning}
                  className="rounded-full border border-base-border px-2.5 py-1 text-xs font-medium hover:bg-base-border/40 disabled:opacity-40"
                >
                  {t.taskCard.pauseButton}
                </button>
                <button
                  type="button"
                  onClick={stopStopwatch}
                  disabled={!stopwatchRunning && stopwatchAccumulatedSec === 0}
                  className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
                >
                  {t.taskCard.stopButton}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-base-border pt-3">
            <span className="block text-xs text-base-muted">{t.taskCard.tags}</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className={clsx('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white', areaBgClass(tag.colorIndex))}
                >
                  #{tag.name}
                  <button onClick={() => removeTag(tag.id)} aria-label={t.taskCard.removeTagAriaLabel(tag.name)} className="hover:opacity-70">
                    ✕
                  </button>
                </span>
              ))}
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(newTagName);
                  }
                }}
                placeholder={t.taskCard.addTagPlaceholder}
                list="task-tag-suggestions"
                className="min-w-0 flex-1 rounded-full border border-base-border bg-base-bg px-2 py-0.5 text-xs"
              />
            </div>
            <datalist id="task-tag-suggestions">
              {tags.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </div>

          {task.kind === 'DAY_AREA' && referenceDate ? (
            <div className="space-y-2 border-t border-base-border pt-3">
              <span className="block text-xs text-base-muted">{t.taskCard.repeat}</span>
              {recurrenceOpen ? (
                <div className="space-y-2">
                  <RecurrenceEditor value={recurrenceValue} referenceDate={referenceDate} onChange={setRecurrenceValue} />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveRecurrence(recurrenceValue)}
                      disabled={recurrenceBusy}
                      className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
                    >
                      {t.common.save}
                    </button>
                    <button
                      onClick={() => setRecurrenceOpen(false)}
                      className="rounded-full border border-base-border px-3 py-1 text-xs"
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-base-muted">
                    {recurrenceValue ? describeRecurrence(recurrenceValue, referenceDate) : t.taskCard.noRecurrence}
                  </span>
                  <button
                    onClick={() => setRecurrenceOpen(true)}
                    className="rounded-full border border-base-border px-3 py-1 text-xs hover:bg-base-border/40"
                  >
                    {recurrenceValue ? t.taskCard.repeatChange : t.taskCard.repeatSet}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {!task.parentTaskId ? (
            <div className="space-y-2 border-t border-base-border pt-3">
              <span className="block text-xs text-base-muted">
                {t.taskCard.subtasks}{subtasks.length > 0 ? ` (${subtasks.filter((s) => s.done).length}/${subtasks.length})` : ''}
              </span>
              {subtasks.length > 0 ? (
                <div className="space-y-1.5">
                  {subtasks.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSubtask(s)}
                        aria-label={t.taskCard.toggleSubtaskAriaLabel(s.done)}
                        className={clsx(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-[10px] transition',
                          s.done ? 'border-accent bg-accent text-white' : 'border-base-border text-transparent hover:border-accent'
                        )}
                      >
                        ✓
                      </button>
                      <span className={clsx('flex-1 truncate text-sm', s.done && 'text-base-muted line-through')}>{s.text}</span>
                      <button
                        onClick={() => deleteSubtask(s)}
                        aria-label={t.taskCard.removeSubtaskAriaLabel(s.text)}
                        className="text-xs text-priority-high hover:underline"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <AddTaskInline onAdd={addSubtask} placeholder={t.taskCard.addSubtaskPlaceholder} />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            {onCreateCalendarEvent && task.scheduledAt ? (
              <button
                onClick={() => onCreateCalendarEvent(task.id)}
                className="rounded-full border border-base-border px-3 py-1 text-xs font-medium hover:bg-base-border/40"
              >
                {t.taskCard.createCalendarEvent}
              </button>
            ) : null}
            {onExportTodoist ? (
              <button
                onClick={() => onExportTodoist(task.id)}
                className="rounded-full border border-base-border px-3 py-1 text-xs font-medium hover:bg-base-border/40"
              >
                {t.taskCard.exportTodoist}
              </button>
            ) : null}
            <button
              onClick={() => onDelete(task.id)}
              className="rounded-full px-3 py-1 text-xs font-medium text-priority-high hover:bg-priority-high/10"
            >
              {t.taskCard.delete}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white"
            >
              {t.taskCard.saveClose}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

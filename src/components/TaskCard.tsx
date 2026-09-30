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
import { isoWeekAndDowFor, todayLocalString } from '@/lib/week';
import { QuickDateChips } from '@/components/QuickDateChips';
import { useToast } from '@/components/Toast';
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
  // Permite arrastrar tarjetas que no son DAY_AREA (p.ej. tareas ya
  // organizadas en la Bandeja, sin día todavía) a una columna de día+área.
  dragEnabled?: boolean;
  // Marcar/desmarcar Las 3 del día: por defecto usa onUpdate directo, pero
  // DayCard lo sustituye para poder ofrecer el selector de sustitución
  // cuando ya hay 3 marcadas ese día.
  onToggleTop3?: (id: string, next: boolean) => void;
  // true mientras hay un PATCH de isTop3 en curso para esta tarea: desactiva
  // el botón para que un doble clic no dispare un segundo toggle.
  isTop3Pending?: boolean;
  // Activa el modo "solo primer gesto" en Hoy para tareas pospuestas 2+
  // veces con primer gesto definido. No se activa en Semana (ahí interesa
  // ver la tarea completa para planificar, no reducirla a un paso).
  focusMode?: boolean;
  // Abre el Modo foco a pantalla completa para esta tarea (sustituye al
  // Pomodoro independiente). Si no se pasa, el botón "Empezar" no se muestra.
  onStartFocus?: (id: string) => void;
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

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
  dragEnabled,
  onToggleTop3,
  isTop3Pending,
  focusMode,
  onStartFocus,
}: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(task.text);
  const [description, setDescription] = useState(task.description ?? '');
  const [assignedTo, setAssignedTo] = useState(task.assignedTo ?? '');
  const [waitingOn, setWaitingOn] = useState(task.waitingOn ?? '');
  const initialFollowUp = task.followUpDate ? splitScheduled(task.followUpDate).date : '';
  const [followUpDate, setFollowUpDate] = useState(initialFollowUp);
  const { showToast } = useToast();
  const [newTagName, setNewTagName] = useState('');
  const [busy, setBusy] = useState(false);
  const initialSplit = splitScheduled(task.scheduledAt);
  const [date, setDate] = useState(initialSplit.date);
  const [time, setTime] = useState(initialSplit.time);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDate, setAssignDate] = useState(todayLocalString());
  const [assignTime, setAssignTime] = useState('');
  const [assignAreaId, setAssignAreaId] = useState(areas[0]?.id ?? '');
  const [assignBusy, setAssignBusy] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>(task.subtasks);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [recurrenceBusy, setRecurrenceBusy] = useState(false);
  const [recurrenceValue, setRecurrenceValue] = useState<RecurrenceValue | null>(() =>
    task.recurringTemplate ? templateToValue(task.recurringTemplate) : null
  );

  // Cronómetro manual de tiempo ejecutado, desde la propia ficha de la tarea.
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchAccumulatedSec, setStopwatchAccumulatedSec] = useState(0);
  const [stopwatchDoneConfirm, setStopwatchDoneConfirm] = useState(false);

  // Comprobación al marcar prioritaria (A.1.4): se abre solo al activarla,
  // nunca al desactivarla.
  const [priorityCheckOpen, setPriorityCheckOpen] = useState(false);
  const [priorityCheckPrereq, setPriorityCheckPrereq] = useState('');
  const [priorityCheckBusy, setPriorityCheckBusy] = useState(false);
  const [desiredOutcome, setDesiredOutcome] = useState(task.desiredOutcome ?? '');
  const [firstStep, setFirstStep] = useState(task.firstStep ?? '');
  const [reserveBusy, setReserveBusy] = useState(false);

  // Modo "solo primer gesto" (Hoy, tarea pospuesta 2+ veces con primer gesto):
  // 'idle' = tarjeta colapsada mostrando solo el primer gesto; 'running' =
  // cuenta atrás de 2 minutos en marcha; 'askContinue' = cuenta atrás
  // terminada, pregunta si sigue o lo deja. `focusDismissed` saca la tarjeta
  // de este modo de forma permanente para esta sesión (pulsó "Seguir").
  const [focusStep, setFocusStep] = useState<'idle' | 'running' | 'askContinue'>('idle');
  const [focusSeconds, setFocusSeconds] = useState(120);
  const [focusDismissed, setFocusDismissed] = useState(false);

  useEffect(() => {
    if (focusStep !== 'running') return;
    if (focusSeconds <= 0) {
      setFocusStep('askContinue');
      return;
    }
    const timer = setTimeout(() => setFocusSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [focusStep, focusSeconds]);

  function startFocusTimer() {
    setFocusSeconds(120);
    setFocusStep('running');
  }
  function continueWorking() {
    setFocusStep('idle');
    setFocusDismissed(true);
    setOpen(true);
  }
  function stopHereForNow() {
    setFocusStep('idle');
  }
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
    if (minutes > 0) await onUpdate(task.id, { executedMinutes: task.executedMinutes + minutes });
    setStopwatchDoneConfirm(true);
  }

  async function confirmStopwatchDone(done: boolean) {
    setStopwatchDoneConfirm(false);
    if (done) await onUpdate(task.id, { done: true });
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

  async function saveWaitingOn() {
    const next = waitingOn.trim() || null;
    if (next !== (task.waitingOn ?? null)) await onUpdate(task.id, { waitingOn: next });
  }

  async function saveFollowUpDate(next: string) {
    setFollowUpDate(next);
    const iso = next ? new Date(`${next}T00:00`).toISOString() : null;
    await onUpdate(task.id, { followUpDate: iso });
  }

  async function copyClaimMessage() {
    const person = (task.assignedTo?.trim() || task.waitingOn?.trim() || '').trim();
    const dateLabel = task.followUpDate
      ? new Date(task.followUpDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';
    const message = dateLabel
      ? t.taskCard.claimMessageWithDate(person, task.text, dateLabel)
      : t.taskCard.claimMessageNoDate(person, task.text);
    try {
      await navigator.clipboard.writeText(message);
      showToast(t.taskCard.claimMessageCopied);
    } catch {
      showToast(t.taskCard.claimMessageCopied, 'error');
    }
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

  async function togglePriority() {
    const next = !task.isPriority;
    await onUpdate(task.id, { isPriority: next });
    if (next) setPriorityCheckOpen(true);
  }

  async function submitPriorityCheck() {
    setPriorityCheckBusy(true);
    try {
      const trimmedOutcome = desiredOutcome.trim();
      if (trimmedOutcome !== (task.desiredOutcome ?? '')) {
        await onUpdate(task.id, { desiredOutcome: trimmedOutcome || null });
      }
      const lines = priorityCheckPrereq
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      for (const line of lines) {
        const created = await api.post('/api/tasks', { kind: 'BACKLOG', text: line, parentTaskId: task.id });
        setSubtasks((prev) => [...prev, created]);
      }
    } finally {
      setPriorityCheckPrereq('');
      setPriorityCheckOpen(false);
      setPriorityCheckBusy(false);
    }
  }

  async function saveFirstStep() {
    const next = firstStep.trim() || null;
    if (next !== (task.firstStep ?? null)) await onUpdate(task.id, { firstStep: next });
  }

  async function saveDesiredOutcome() {
    const next = desiredOutcome.trim() || null;
    if (next !== (task.desiredOutcome ?? null)) await onUpdate(task.id, { desiredOutcome: next });
  }

  async function toggleDone() {
    setBusy(true);
    await onUpdate(task.id, { done: !task.done });
    setBusy(false);
  }

  async function saveSchedule(nextDate: string, nextTime: string) {
    // H4 (auditoría UX): antes exigía fecha Y hora para guardar nada, y solo
    // movía la tarea de día cuando la nueva fecha caía en la semana que se
    // estaba viendo. Ahora la hora es opcional y la tarea se mueve al día
    // correcto (semana incluida) siempre que haya fecha.
    if (!nextDate) {
      if (task.scheduledAt) await onUpdate(task.id, { scheduledAt: null });
      return;
    }
    const patch: Record<string, unknown> = {
      scheduledAt: nextTime ? new Date(`${nextDate}T${nextTime}`).toISOString() : null,
    };
    if (task.kind === 'DAY_AREA') {
      const { isoWeek, dayOfWeek } = isoWeekAndDowFor(nextDate);
      patch.isoWeek = isoWeek;
      patch.dayOfWeek = dayOfWeek;
    }
    await onUpdate(task.id, patch);
  }

  async function reserveTime() {
    if (!onCreateCalendarEvent || !date) return;
    setReserveBusy(true);
    try {
      // Espera a que la fecha/hora elegidas se guarden antes de pedir el
      // evento: si no, el endpoint puede leer la tarea todavía sin
      // scheduledAt (carrera entre este clic y el guardado del campo) y
      // devuelve "la tarea no tiene fecha y hora asignada" a la primera.
      await saveSchedule(date, time);
      await onCreateCalendarEvent(task.id);
    } finally {
      setReserveBusy(false);
    }
  }

  async function submitAssignDate() {
    if (!assignDate || !assignAreaId) return;
    setAssignBusy(true);
    try {
      const { isoWeek, dayOfWeek } = isoWeekAndDowFor(assignDate);
      const patch: Record<string, unknown> = { kind: 'DAY_AREA', isoWeek, dayOfWeek, areaId: assignAreaId };
      if (assignTime) patch.scheduledAt = new Date(`${assignDate}T${assignTime}`).toISOString();
      await onUpdate(task.id, patch);
      setAssignOpen(false);
    } finally {
      setAssignBusy(false);
    }
  }

  const scheduledLabel = task.scheduledAt
    ? new Date(task.scheduledAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  const showFocusPrompt =
    focusMode && !focusDismissed && task.kind === 'DAY_AREA' && !task.done && task.rescheduleCount >= 2 && !!task.firstStep;

  if (showFocusPrompt) {
    const mm = String(Math.floor(focusSeconds / 60)).padStart(2, '0');
    const ss = String(focusSeconds % 60).padStart(2, '0');
    return (
      <div className="rounded-card border border-accent/40 bg-accent/5 p-3 text-center text-sm">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-base-muted">{t.taskCard.focusEyebrow}</p>
        <p className="mb-2 truncate text-xs text-base-muted" title={task.text}>
          {task.text}
        </p>
        <p className="mb-3 font-medium">{task.firstStep}</p>
        {focusStep === 'idle' ? (
          <button onClick={startFocusTimer} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white">
            {t.taskCard.focusStartButton}
          </button>
        ) : null}
        {focusStep === 'running' ? (
          <p className="text-2xl font-semibold tabular-nums">
            {mm}:{ss}
          </p>
        ) : null}
        {focusStep === 'askContinue' ? (
          <div className="space-y-2">
            <p className="text-xs text-base-muted">{t.taskCard.focusContinueQuestion}</p>
            <div className="flex justify-center gap-2">
              <button onClick={continueWorking} className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white">
                {t.taskCard.focusContinueYes}
              </button>
              <button
                onClick={stopHereForNow}
                className="rounded-full border border-base-border px-4 py-1.5 text-xs font-medium hover:bg-base-border/40"
              >
                {t.taskCard.focusContinueNo}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const currentProject = projects.find((p) => p.id === task.projectId);
  const collaboratorSuggestions = Array.from(
    new Set((currentProject?.collaborators ?? projects.flatMap((p) => p.collaborators)).map((c) => c.name))
  );
  const assignedToListId = `assigned-to-${task.id}`;

  // Delegadas y en espera (M3): dentro de gtdStatus=ESPERANDO, "Delegada" es
  // la que además tiene assignedTo (se ha pasado a otra persona); "En
  // espera" es la que solo depende de alguien (waitingOn) sin haberla
  // delegado. Válido en cualquier vista, no solo en la pestaña de Bandeja.
  const isEsperando = task.gtdStatus === 'ESPERANDO';
  const delegated = isEsperando && !!task.assignedTo?.trim();
  const waitingPerson = delegated ? task.assignedTo : task.waitingOn;
  const followUpOverdueDays = task.followUpDate
    ? Math.floor((Date.now() - new Date(task.followUpDate).getTime()) / 86400000)
    : null;
  const followUpOverdue = isEsperando && followUpOverdueDays !== null && followUpOverdueDays >= 0;

  return (
    <div
      id={`task-${task.id}`}
      draggable={task.kind === 'DAY_AREA' || dragEnabled}
      onDragStart={(e) => {
        // Si el gesto empieza sobre un control interactivo (botón, input...),
        // no es una intención de arrastrar la tarjeta: cancelamos el drag
        // nativo para que el clic llegue normalmente al control. Sin esto,
        // el navegador puede interpretar un ligero movimiento entre
        // mousedown/mouseup sobre la estrella (u otro botón) como el inicio
        // de un arrastre y "tragarse" el clic.
        const target = e.target as HTMLElement;
        if (target.closest('button, input, select, textarea, a, label')) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={clsx(
        'rounded-card border bg-base-surface transition',
        followUpOverdue ? 'border-priority-high bg-priority-high/5' : 'border-base-border',
        task.done && 'opacity-60',
        (task.kind === 'DAY_AREA' || dragEnabled) && 'cursor-grab active:cursor-grabbing'
      )}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <button
          onClick={toggleDone}
          disabled={busy}
          aria-label={t.taskCard.toggleDoneAriaLabel(task.done)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        >
          <span
            className={clsx(
              'flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs transition',
              task.done ? 'border-accent bg-accent text-white' : 'border-base-border text-transparent hover:border-accent'
            )}
          >
            ✓
          </span>
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
            {task.priority === 'HIGH' ? (
              <span className="inline-flex items-center gap-1">
                <PriorityDot priority={task.priority} /> {PRIORITY_LABELS[task.priority]}
              </span>
            ) : null}
            {task.durationMinutes ? <span>· {formatDurationMinutes(task.durationMinutes)}</span> : null}
            {task.executedMinutes > 0 ? <span>⏱ {formatDurationMinutes(task.executedMinutes)} {t.taskCard.executedSuffix}</span> : null}
            {task.description ? <span title={task.description}>{t.taskCard.hasNotes}</span> : null}
            {task.project ? (
              <span className="rounded-full bg-base-border/50 px-2 py-0.5">{task.project.name}</span>
            ) : null}
            {scheduledLabel ? <span>{scheduledLabel}</span> : null}
            {isEsperando && waitingPerson ? (
              <span className={followUpOverdue ? 'font-medium text-priority-high' : undefined}>
                {delegated ? t.taskCard.delegatedToLabel(waitingPerson) : t.taskCard.waitingOnLabel(waitingPerson)}
                {task.followUpDate
                  ? ` · ${followUpOverdue ? t.taskCard.overdueLabel(followUpOverdueDays!) : t.taskCard.followUpLabel(formatDate(task.followUpDate))}`
                  : ''}
              </span>
            ) : task.assignedTo ? (
              <span>{task.assignedTo}</span>
            ) : null}
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

          {!task.done ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {!assignOpen ? (
                <button onClick={() => setAssignOpen(true)} className="text-xs font-medium text-accent hover:underline">
                  {t.taskCard.assignDateButton}
                </button>
              ) : null}
              {onStartFocus ? (
                <button onClick={() => onStartFocus(task.id)} className="text-xs font-medium text-accent hover:underline">
                  {t.taskCard.startFocusButton}
                </button>
              ) : null}
              {isEsperando ? (
                <button onClick={copyClaimMessage} className="text-xs font-medium text-accent hover:underline">
                  {t.taskCard.copyClaimMessageButton}
                </button>
              ) : null}
              {assignOpen ? (
                <div className="space-y-1.5 rounded-lg border border-base-border p-2">
                  <QuickDateChips onPick={setAssignDate} />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <input
                      type="date"
                      value={assignDate}
                      onChange={(e) => setAssignDate(e.target.value)}
                      className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs"
                    />
                    <select
                      value={assignAreaId}
                      onChange={(e) => setAssignAreaId(e.target.value)}
                      className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs"
                    >
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <TimeSelect value={assignTime} onChange={setAssignTime} className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs" />
                    <button
                      onClick={submitAssignDate}
                      disabled={!assignDate || !assignAreaId || assignBusy}
                      className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
                    >
                      {t.taskCard.assignDateSubmit}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <button
          onClick={togglePriority}
          aria-label={t.taskCard.priorityAriaLabel(task.isPriority)}
          title={t.taskCard.priorityAriaLabel(task.isPriority)}
          className={clsx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-base-border/40',
            task.isPriority ? 'text-fuchsia-600' : 'text-base-muted/50 hover:text-base-muted'
          )}
        >
          🚩
        </button>

        {task.kind === 'DAY_AREA' ? (
          <button
            onClick={() =>
              onToggleTop3 ? onToggleTop3(task.id, !task.isTop3) : onUpdate(task.id, { isTop3: !task.isTop3 })
            }
            disabled={isTop3Pending}
            aria-label={t.taskCard.top3AriaLabel(task.isTop3)}
            title={t.taskCard.top3AriaLabel(task.isTop3)}
            className={clsx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-base-border/40 disabled:opacity-50',
              task.isTop3 ? 'text-amber-500' : 'text-base-muted/50 hover:text-base-muted'
            )}
          >
            {task.isTop3 ? '⭐' : '☆'}
          </button>
        ) : null}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={t.taskCard.editAriaLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base-muted transition hover:bg-base-border/40 hover:text-base-text"
        >
          ✏️
        </button>
      </div>

      {priorityCheckOpen ? (
        <div className="mx-3 mb-3 space-y-2 rounded-card border border-fuchsia-500/40 bg-fuchsia-500/5 p-3 text-xs">
          <p className="font-medium">{t.taskCard.priorityCheckTitle}</p>
          <label className="block space-y-1">
            <span>{t.taskCard.priorityCheckOutcomeQuestion}</span>
            <input
              value={desiredOutcome}
              onChange={(e) => setDesiredOutcome(e.target.value)}
              maxLength={300}
              placeholder={t.taskCard.priorityCheckOutcomePlaceholder}
              className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-xs"
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            <span>{t.taskCard.priorityCheckAgendaQuestion}</span>
            {task.scheduledAt ? (
              <span className="font-medium text-priority-low">✓ {t.taskCard.priorityCheckAgendaYes}</span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(true);
                  setPriorityCheckOpen(false);
                }}
                className="font-medium text-accent hover:underline"
              >
                {t.taskCard.priorityCheckAgendaCta}
              </button>
            )}
          </div>
          <label className="block space-y-1">
            <span>{t.taskCard.priorityCheckPrereqQuestion}</span>
            <textarea
              value={priorityCheckPrereq}
              onChange={(e) => setPriorityCheckPrereq(e.target.value)}
              rows={2}
              placeholder={t.taskCard.priorityCheckPrereqPlaceholder}
              className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-xs"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={submitPriorityCheck}
              disabled={priorityCheckBusy}
              className="rounded-full bg-fuchsia-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
            >
              {t.taskCard.priorityCheckDone}
            </button>
          </div>
        </div>
      ) : null}

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

          <label className="block space-y-1">
            <span className="block text-xs text-base-muted">{t.taskCard.firstStepLabel}</span>
            <input
              value={firstStep}
              onChange={(e) => setFirstStep(e.target.value)}
              onBlur={saveFirstStep}
              maxLength={120}
              placeholder={t.taskCard.firstStepPlaceholder}
              className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
            />
          </label>

          {task.isPriority ? (
            <label className="block space-y-1">
              <span className="block text-xs text-base-muted">{t.taskCard.desiredOutcomeLabel}</span>
              <input
                value={desiredOutcome}
                onChange={(e) => setDesiredOutcome(e.target.value)}
                onBlur={saveDesiredOutcome}
                maxLength={300}
                placeholder={t.taskCard.priorityCheckOutcomePlaceholder}
                className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
              />
            </label>
          ) : null}

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
            {isEsperando ? (
              <label className="space-y-1">
                <span className="block text-xs text-base-muted">
                  {delegated ? t.taskCard.delegatedToFieldLabel : t.taskCard.waitingOnFieldLabel}
                </span>
                <input
                  value={waitingOn}
                  onChange={(e) => setWaitingOn(e.target.value)}
                  onBlur={saveWaitingOn}
                  placeholder={t.taskCard.assignedToPlaceholder}
                  className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
                />
              </label>
            ) : null}
            {isEsperando ? (
              <label className="space-y-1">
                <span className="block text-xs text-base-muted">{t.taskCard.followUpDateLabel}</span>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => saveFollowUpDate(e.target.value)}
                  className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={copyClaimMessage}
                  className="mt-1 rounded-full border border-base-border px-3 py-1 text-xs font-medium hover:bg-base-border/40"
                >
                  {t.taskCard.copyClaimMessageButton}
                </button>
              </label>
            ) : null}
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
              {onCreateCalendarEvent ? (
                <button
                  type="button"
                  onClick={reserveTime}
                  disabled={!date || reserveBusy}
                  title={!date ? t.taskCard.reserveTimeNeedsDate : undefined}
                  className="mt-1 rounded-full border border-base-border px-3 py-1 text-xs font-medium hover:bg-base-border/40 disabled:opacity-40"
                >
                  {task.calendarEventId ? t.taskCard.updateCalendarEvent : t.taskCard.reserveTime}
                </button>
              ) : null}
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
            {stopwatchDoneConfirm ? (
              <div className="flex flex-wrap items-center gap-2 rounded-card border border-accent/40 bg-accent/5 p-2 text-xs">
                <span>{t.taskCard.taskDoneQuestion}</span>
                <button
                  type="button"
                  onClick={() => confirmStopwatchDone(true)}
                  className="rounded-full bg-accent px-2.5 py-1 font-semibold text-white"
                >
                  {t.taskCard.taskDoneYes}
                </button>
                <button
                  type="button"
                  onClick={() => confirmStopwatchDone(false)}
                  className="rounded-full border border-base-border px-2.5 py-1 font-medium hover:bg-base-border/40"
                >
                  {t.taskCard.taskDoneNo}
                </button>
              </div>
            ) : null}
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

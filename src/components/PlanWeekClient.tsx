'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { currentIsoWeek } from '@/lib/week';
import { useToast } from '@/components/Toast';
import { useInboxCapture } from '@/components/InboxCaptureContext';
import type { WeekFull, Habit, ProjectWithAreaAndCollaborators, Area, Tag, TaskWithProject } from '@/types';
import { DayCard } from '@/components/DayCard';
import { HabitGrid } from '@/components/HabitGrid';
import { MoodSliders } from '@/components/MoodSliders';
import { ObjectivesForm, EvaluationForm } from '@/components/WeekMetaForm';
import { PriorityListSection } from '@/components/PriorityListSection';
import { ProjectFocusPicker } from '@/components/ProjectFocusPicker';
import { BandejaSummaryLink } from '@/components/BandejaSummaryLink';
import { PlanningWizard } from '@/components/PlanningWizard';
import { DayCloseRitual } from '@/components/DayCloseRitual';
import { WeekNav } from '@/components/WeekNav';
import { DayNav } from '@/components/DayNav';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { DAY_NAMES, dateForDayOfWeek, addWeeks } from '@/lib/week';
import { countPendingProcess } from '@/lib/inbox';
// Alias: muchos callbacks locales de este componente usan `text` como nombre de parámetro.
import { text as t } from '@/i18n/es';

interface Props {
  initialWeek: WeekFull;
  initialInbox: TaskWithProject[];
  habits: Habit[];
  projects: ProjectWithAreaAndCollaborators[];
  areas: Area[];
  tags: Tag[];
  isoWeek: string;
  mode: 'day' | 'week';
  viewDow: number;
  todayDow: number;
  todoistConnected: boolean;
  calendarConnected: boolean;
  dailyCapacityMinutes: number;
}

function tempId() {
  return `tmp_${Math.random().toString(36).slice(2)}`;
}

export function PlanWeekClient({
  initialWeek,
  initialInbox,
  habits,
  projects,
  areas,
  tags,
  isoWeek,
  mode,
  viewDow,
  todayDow,
  todoistConnected,
  calendarConnected,
  dailyCapacityMinutes,
}: Props) {
  const [week, setWeek] = useState(initialWeek);
  const [inbox, setInbox] = useState(initialInbox);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [closeRitualOpen, setCloseRitualOpen] = useState(false);
  const { showToast } = useToast();
  const { subscribe } = useInboxCapture();
  const router = useRouter();
  const weekIsoOfToday = currentIsoWeek();

  // La captura rápida (botón flotante / atajo N) vive en el layout, fuera de
  // esta pantalla: publica la tarea creada por aquí para que aparezca en la
  // Bandeja al instante, sin esperar a un recargado.
  useEffect(() => subscribe((task) => setInbox((prev) => [...prev, task])), [subscribe]);

  const hardRefresh = useCallback(async () => {
    const fresh = await api.get(`/api/weeks/${isoWeek}`);
    setWeek(fresh);
  }, [isoWeek]);

  function findTask(id: string): { location: 'week' | 'inbox'; task: TaskWithProject } | null {
    const w = week.tasks.find((t) => t.id === id);
    if (w) return { location: 'week', task: w };
    const i = inbox.find((t) => t.id === id);
    if (i) return { location: 'inbox', task: i };
    return null;
  }

  // ---------- Tareas (optimista: se ve al instante, se confirma en segundo plano) ----------

  async function addTask(
    kind: 'DAY_AREA' | 'PRIORITY_ACTION' | 'CALL',
    text: string,
    extra?: { dayOfWeek?: number; areaId?: string }
  ) {
    const day = extra?.dayOfWeek !== undefined ? week.days.find((d) => d.dayOfWeek === extra.dayOfWeek) : undefined;
    const optimisticArea = extra?.areaId ? areas.find((a) => a.id === extra.areaId) ?? null : null;
    const optimistic: TaskWithProject = {
      id: tempId(),
      userId: '',
      weekId: week.id,
      dayId: day?.id ?? null,
      kind,
      areaId: extra?.areaId ?? null,
      area: optimisticArea,
      text,
      description: null,
      tags: [],
      done: false,
      priority: 'MEDIUM',
      durationMinutes: null,
      quadrant: null,
      assignedTo: null,
      isTop3: false,
      executedMinutes: 0,
      isPriority: false,
      firstStep: null,
      context: null,
      gtdStatus: 'ACTIVA',
      processedAt: null,
      waitingOn: null,
      followUpDate: null,
      snoozeUntil: null,
      rescheduleCount: 0,
      projectId: null,
      project: null,
      scheduledAt: null,
      recurrence: 'NONE',
      recurringTemplateId: null,
      parentTaskId: null,
      subtasks: [],
      recurringTemplate: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setWeek((w) => ({ ...w, tasks: [...w.tasks, optimistic] }));

    try {
      const created = await api.post('/api/tasks', { isoWeek, kind, text, ...extra });
      setWeek((w) => ({
        ...w,
        tasks: w.tasks.map((t) =>
          t.id === optimistic.id ? { ...created, project: null, area: optimisticArea, subtasks: [], recurringTemplate: null, tags: [] } : t
        ),
      }));
    } catch {
      setWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== optimistic.id) }));
      showToast(t.planWeekClient.createTaskError, 'error');
    }
  }

  async function addBacklog(text: string) {
    const optimistic: TaskWithProject = {
      id: tempId(),
      userId: '',
      weekId: null,
      dayId: null,
      kind: 'BACKLOG',
      areaId: null,
      area: null,
      text,
      description: null,
      tags: [],
      done: false,
      priority: 'MEDIUM',
      durationMinutes: null,
      quadrant: null,
      assignedTo: null,
      isTop3: false,
      executedMinutes: 0,
      isPriority: false,
      firstStep: null,
      context: null,
      gtdStatus: 'ACTIVA',
      processedAt: null,
      waitingOn: null,
      followUpDate: null,
      snoozeUntil: null,
      rescheduleCount: 0,
      projectId: null,
      project: null,
      scheduledAt: null,
      recurrence: 'NONE',
      recurringTemplateId: null,
      parentTaskId: null,
      subtasks: [],
      recurringTemplate: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setInbox((prev) => [...prev, optimistic]);

    try {
      const created = await api.post('/api/tasks', { kind: 'BACKLOG', text });
      setInbox((prev) =>
        prev.map((t) => (t.id === optimistic.id ? { ...created, project: null, area: null, subtasks: [], recurringTemplate: null, tags: [] } : t))
      );
    } catch {
      setInbox((prev) => prev.filter((t) => t.id !== optimistic.id));
      showToast(t.planWeekClient.saveInboxError, 'error');
    }
  }

  async function updateTask(id: string, patch: Record<string, unknown>) {
    const found = findTask(id);
    if (!found) return;
    const { location, task: previous } = found;

    const project = 'projectId' in patch ? projects.find((p) => p.id === patch.projectId) ?? null : previous.project;
    const promotedOut = location === 'inbox' && patch.kind && patch.kind !== 'BACKLOG';
    const demotedToBacklog = location === 'week' && patch.kind === 'BACKLOG';
    const movesToOtherWeek =
      location === 'week' && !demotedToBacklog && patch.isoWeek !== undefined && patch.isoWeek !== isoWeek;

    // El servidor resuelve dayId a partir de isoWeek+dayOfWeek; el patch nunca lo
    // incluye directamente, así que hay que recalcularlo aquí o la tarjeta se queda
    // "pegada" visualmente a su día anterior tras moverla (p.ej. al arrastrarla).
    let dayId = previous.dayId;
    if (demotedToBacklog || movesToOtherWeek) {
      dayId = null;
    } else if (typeof patch.dayOfWeek === 'number') {
      const targetDow = patch.dayOfWeek;
      dayId = week.days.find((d) => d.dayOfWeek === targetDow)?.id ?? null;
    }

    const optimisticTask = { ...previous, ...patch, project, dayId } as TaskWithProject;

    // El servidor reordena por hora todo el grupo día+área cuando cambia la
    // hora, el día o el área de una tarea; refrescamos para reflejar ese
    // reordenado (afecta también a otras tareas, no solo a esta).
    const needsOrderRefresh =
      optimisticTask.kind === 'DAY_AREA' &&
      !!optimisticTask.dayId &&
      !!optimisticTask.areaId &&
      ('scheduledAt' in patch || typeof patch.dayOfWeek === 'number' || 'areaId' in patch);

    if (promotedOut) {
      // Sale de la bandeja de entrada; si pertenece a la semana que se está viendo, se añade ahí.
      setInbox((prev) => prev.filter((t) => t.id !== id));
      if (patch.isoWeek === isoWeek) {
        setWeek((w) => ({ ...w, tasks: [...w.tasks, optimisticTask] }));
      }
    } else if (demotedToBacklog) {
      // Pasa a la bandeja de entrada; si se está viendo, la reflejamos ahí también.
      setWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== id) }));
      setInbox((prev) => [...prev, optimisticTask]);
    } else if (movesToOtherWeek) {
      // Se va a una semana distinta de la que se está viendo: desaparece de aquí.
      setWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== id) }));
    } else if (location === 'week') {
      setWeek((w) => ({ ...w, tasks: w.tasks.map((t) => (t.id === id ? optimisticTask : t)) }));
    } else {
      setInbox((prev) => prev.map((t) => (t.id === id ? optimisticTask : t)));
    }

    try {
      await api.patch(`/api/tasks/${id}`, patch);
      if ((promotedOut && patch.isoWeek === isoWeek) || needsOrderRefresh) await hardRefresh();
    } catch (err) {
      if (promotedOut) {
        setInbox((prev) => [...prev, previous]);
        setWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== id) }));
      } else if (demotedToBacklog) {
        setInbox((prev) => prev.filter((t) => t.id !== id));
        setWeek((w) => ({ ...w, tasks: [...w.tasks, previous] }));
      } else if (movesToOtherWeek) {
        setWeek((w) => ({ ...w, tasks: [...w.tasks, previous] }));
      } else if (location === 'week') {
        setWeek((w) => ({ ...w, tasks: w.tasks.map((t) => (t.id === id ? previous : t)) }));
      } else {
        setInbox((prev) => prev.map((t) => (t.id === id ? previous : t)));
      }
      showToast(err instanceof ApiError ? err.message : t.planWeekClient.saveChangeError, 'error');
    }
  }

  // Reordenación manual al arrastrar dentro de la misma lista día+área.
  async function reorderTasks(orderedIds: string[]) {
    const previousOrders = new Map(week.tasks.filter((t) => orderedIds.includes(t.id)).map((t) => [t.id, t.order]));
    setWeek((w) => ({
      ...w,
      tasks: w.tasks.map((t) => {
        const index = orderedIds.indexOf(t.id);
        return index === -1 ? t : { ...t, order: index };
      }),
    }));
    try {
      await Promise.all(orderedIds.map((id, index) => api.patch(`/api/tasks/${id}`, { order: index })));
    } catch {
      setWeek((w) => ({
        ...w,
        tasks: w.tasks.map((t) => (previousOrders.has(t.id) ? { ...t, order: previousOrders.get(t.id)! } : t)),
      }));
      showToast(t.planWeekClient.reorderError, 'error');
    }
  }

  async function deleteTask(id: string) {
    const found = findTask(id);
    if (!found) return;
    const { location, task: previous } = found;

    if (location === 'week') setWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== id) }));
    else setInbox((prev) => prev.filter((t) => t.id !== id));

    try {
      await api.delete(`/api/tasks/${id}`);
    } catch {
      if (location === 'week') setWeek((w) => ({ ...w, tasks: [...w.tasks, previous] }));
      else setInbox((prev) => [...prev, previous]);
      showToast(t.planWeekClient.deleteTaskError, 'error');
    }
  }

  async function exportTodoist(id: string) {
    try {
      await api.post('/api/integrations/todoist/export', { taskId: id });
      showToast(t.planWeekClient.exportedTodoist);
    } catch {
      showToast(t.planWeekClient.exportTodoistError, 'error');
    }
  }

  async function createCalendarEvent(id: string) {
    try {
      await api.post('/api/integrations/calendar/create-event', { taskId: id });
      showToast(t.planWeekClient.calendarEventCreated);
    } catch {
      showToast(t.planWeekClient.calendarEventError, 'error');
    }
  }

  // ---------- Hábitos ----------

  async function toggleHabit(habitId: string, dayOfWeek: number, done: boolean) {
    const previous = week.habitCompletions;
    const exists = previous.some((c) => c.habitId === habitId && c.dayOfWeek === dayOfWeek);
    const next = exists
      ? previous.map((c) => (c.habitId === habitId && c.dayOfWeek === dayOfWeek ? { ...c, done } : c))
      : [...previous, { id: tempId(), habitId, weekId: week.id, dayOfWeek, done }];
    setWeek((w) => ({ ...w, habitCompletions: next }));

    try {
      await api.patch(`/api/habits/${habitId}/completions`, { isoWeek, dayOfWeek, done });
    } catch {
      setWeek((w) => ({ ...w, habitCompletions: previous }));
      showToast(t.planWeekClient.saveHabitError, 'error');
    }
  }

  // ---------- Semana: estado, objetivos, evaluación, estrellas ----------

  async function saveWeekMeta(patch: Record<string, unknown>) {
    setWeek((w) => ({ ...w, ...patch }));
    try {
      await api.patch(`/api/weeks/${isoWeek}`, patch);
    } catch {
      showToast(t.planWeekClient.saveGenericError, 'error');
      await hardRefresh();
    }
  }

  async function saveStar(dayOfWeek: number, v: number) {
    const value = v === 0 ? null : v;
    setWeek((w) => ({
      ...w,
      days: w.days.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, starRating: value } : d)),
    }));
    try {
      await api.patch(`/api/weeks/${isoWeek}`, { days: [{ dayOfWeek, starRating: value }] });
    } catch {
      showToast(t.planWeekClient.saveRatingError, 'error');
      await hardRefresh();
    }
  }

  async function saveJournal(dayOfWeek: number, note: string) {
    const value = note.trim() || null;
    setWeek((w) => ({
      ...w,
      days: w.days.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, journalNote: value } : d)),
    }));
    try {
      await api.patch(`/api/weeks/${isoWeek}`, { days: [{ dayOfWeek, journalNote: value }] });
    } catch {
      showToast(t.planWeekClient.saveJournalError, 'error');
      await hardRefresh();
    }
  }

  async function replanPendingToTomorrow(pendingIds: string[], tomorrowIsoWeek: string, tomorrowDow: number) {
    await Promise.all(pendingIds.map((id) => updateTask(id, { isoWeek: tomorrowIsoWeek, dayOfWeek: tomorrowDow })));
    // El dayId real se resuelve en el servidor; refrescamos para que la vista de hoy deje de listarlas.
    await hardRefresh();
  }

  async function addAndTag(text: string, field: 'evalPostponedTaskIds' | 'evalDelegateTaskIds') {
    const id = tempId();
    const optimistic: TaskWithProject = {
      id,
      userId: '',
      weekId: null,
      dayId: null,
      kind: 'BACKLOG',
      areaId: null,
      area: null,
      text,
      description: null,
      tags: [],
      done: false,
      priority: 'MEDIUM',
      durationMinutes: null,
      quadrant: null,
      assignedTo: null,
      isTop3: false,
      executedMinutes: 0,
      isPriority: false,
      firstStep: null,
      context: null,
      gtdStatus: 'ACTIVA',
      processedAt: null,
      waitingOn: null,
      followUpDate: null,
      snoozeUntil: null,
      rescheduleCount: 0,
      projectId: null,
      project: null,
      scheduledAt: null,
      recurrence: 'NONE',
      recurringTemplateId: null,
      parentTaskId: null,
      subtasks: [],
      recurringTemplate: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setInbox((prev) => [...prev, optimistic]);
    setWeek((w) => ({ ...w, [field]: [...(w[field] ?? []), id] }));

    try {
      const created = await api.post('/api/tasks', { kind: 'BACKLOG', text });
      setInbox((prev) =>
        prev.map((t) => (t.id === id ? { ...created, project: null, area: null, subtasks: [], recurringTemplate: null, tags: [] } : t))
      );
      setWeek((w) => ({ ...w, [field]: w[field].map((x: string) => (x === id ? created.id : x)) }));
      await api.patch(`/api/weeks/${isoWeek}`, { [field]: week[field]?.map((x) => (x === id ? created.id : x)) ?? [created.id] });
    } catch {
      setInbox((prev) => prev.filter((t) => t.id !== id));
      setWeek((w) => ({ ...w, [field]: (w[field] ?? []).filter((x: string) => x !== id) }));
      showToast(t.planWeekClient.createTaskError, 'error');
    }
  }

  async function toggleProjectFocus(projectId: string, focused: boolean) {
    const previous = week.projectFocus;
    if (focused) {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;
      setWeek((w) => ({
        ...w,
        projectFocus: [...w.projectFocus, { id: tempId(), weekId: w.id, projectId, project }],
      }));
    } else {
      setWeek((w) => ({ ...w, projectFocus: w.projectFocus.filter((f) => f.projectId !== projectId) }));
    }

    try {
      if (focused) await api.post(`/api/weeks/${isoWeek}/project-focus`, { projectId });
      else await api.delete(`/api/weeks/${isoWeek}/project-focus`, { projectId });
    } catch {
      setWeek((w) => ({ ...w, projectFocus: previous }));
      showToast(t.planWeekClient.saveProjectFocusError, 'error');
    }
  }

  const priorityTasks = week.tasks.filter((t) => t.kind === 'PRIORITY_ACTION');
  const callTasks = week.tasks.filter((t) => t.kind === 'CALL');
  const focusIds = week.projectFocus.map((f) => f.projectId);

  const exportProps = todoistConnected ? { onExportTodoist: exportTodoist } : {};
  const calendarProps = calendarConnected ? { onCreateCalendarEvent: createCalendarEvent } : {};

  if (mode === 'day') {
    const day = week.days.find((d) => d.dayOfWeek === viewDow);
    const dayTasks = week.tasks.filter((t) => t.kind === 'DAY_AREA' && t.dayId === day?.id);
    const isViewingToday = isoWeek === weekIsoOfToday && viewDow === todayDow;
    const viewDate = dateForDayOfWeek(isoWeek, viewDow);
    const tomorrowDow = (viewDow + 1) % 7;
    const tomorrowCrossesWeek = viewDow === 6;
    const tomorrowIsoWeek = tomorrowCrossesWeek ? addWeeks(isoWeek, 1) : isoWeek;
    const tomorrowDay = tomorrowCrossesWeek ? undefined : week.days.find((d) => d.dayOfWeek === tomorrowDow);
    const tomorrowTasks = tomorrowCrossesWeek
      ? null
      : week.tasks.filter((t) => t.kind === 'DAY_AREA' && t.dayId === tomorrowDay?.id);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{isViewingToday ? t.planWeekClient.todayTitle : DAY_NAMES[viewDow]}</h1>
            <p className="text-sm text-base-muted">
              {viewDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setWizardOpen(true)}
              className="rounded-full border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
            >
              {t.planWeekClient.openReflectionMoment}
            </button>
            <button
              onClick={() => setCloseRitualOpen(true)}
              className="rounded-full border border-base-border px-3 py-1.5 text-sm font-medium hover:bg-base-border/40"
            >
              {t.planWeekClient.closeDayButton}
            </button>
            <ViewSwitcher mode="day" isoWeek={isoWeek} />
            <DayNav isoWeek={isoWeek} dayOfWeek={viewDow} />
          </div>
        </div>

        {wizardOpen ? (
          <PlanningWizard
            week={week}
            inbox={inbox}
            projects={projects}
            areas={areas}
            tags={tags}
            isoWeek={isoWeek}
            onSaveWeekMeta={saveWeekMeta}
            onToggleProjectFocus={toggleProjectFocus}
            onAddPriority={(text) => addTask('PRIORITY_ACTION', text)}
            onAddCall={(text) => addTask('CALL', text)}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onAddBacklog={addBacklog}
            onClose={() => {
              setWizardOpen(false);
              router.push(`/semana/${isoWeek}`);
            }}
          />
        ) : null}

        {closeRitualOpen ? (
          <DayCloseRitual
            dayLabel={isViewingToday ? t.planWeekClient.dayLabelToday : t.planWeekClient.dayLabelOther(DAY_NAMES[viewDow])}
            tasks={dayTasks}
            tomorrowLabel={DAY_NAMES[tomorrowDow]}
            tomorrowTasks={tomorrowTasks}
            initialJournalNote={day?.journalNote ?? ''}
            onSaveJournal={(note) => saveJournal(viewDow, note)}
            onReplanPending={() =>
              replanPendingToTomorrow(
                dayTasks.filter((t) => !t.done).map((t) => t.id),
                tomorrowIsoWeek,
                tomorrowDow
              )
            }
            onToggleTomorrowTop3={(id, next) => updateTask(id, { isTop3: next })}
            onClose={() => setCloseRitualOpen(false)}
          />
        ) : null}

        <DayCard
          isoWeek={isoWeek}
          dayOfWeek={viewDow}
          day={day}
          tasks={dayTasks}
          projects={projects}
          areas={areas}
          tags={tags}
          isToday={isViewingToday}
          capacityMinutes={dailyCapacityMinutes}
          onAddTask={(areaId, text) => addTask('DAY_AREA', text, { dayOfWeek: viewDow, areaId })}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onReorderTasks={reorderTasks}
          onStarChange={(v) => saveStar(viewDow, v)}
          {...exportProps}
          {...calendarProps}
        />

        <BandejaSummaryLink pendingCount={countPendingProcess(inbox)} />

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-base-muted">
              {isViewingToday ? t.planWeekClient.todayHabits : t.planWeekClient.dayHabits(DAY_NAMES[viewDow])}
            </h3>
            <HabitGrid habits={habits} completions={week.habitCompletions} onToggle={toggleHabit} mode="today" todayDow={viewDow} />
          </div>
          <div className="space-y-4">
            <PriorityListSection
              title={t.planWeekClient.priorityActionsTitle}
              tasks={priorityTasks}
              projects={projects}
              tags={tags}
              onAdd={(text) => addTask('PRIORITY_ACTION', text)}
              onUpdate={updateTask}
              onDelete={deleteTask}
              {...exportProps}
              {...calendarProps}
            />
            <PriorityListSection
              title={t.planWeekClient.callsTitle}
              tasks={callTasks}
              projects={projects}
              tags={tags}
              onAdd={(text) => addTask('CALL', text)}
              onUpdate={updateTask}
              onDelete={deleteTask}
              {...exportProps}
              {...calendarProps}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t.planWeekClient.weekTitle}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setWizardOpen(true)}
            className="rounded-full border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
          >
            {t.planWeekClient.openReflectionMoment}
          </button>
          <ViewSwitcher mode="week" isoWeek={isoWeek} />
          <WeekNav isoWeek={isoWeek} />
        </div>
      </div>

      {wizardOpen ? (
        <PlanningWizard
          week={week}
          inbox={inbox}
          projects={projects}
          areas={areas}
          tags={tags}
          isoWeek={isoWeek}
          onSaveWeekMeta={saveWeekMeta}
          onToggleProjectFocus={toggleProjectFocus}
          onAddPriority={(text) => addTask('PRIORITY_ACTION', text)}
          onAddCall={(text) => addTask('CALL', text)}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onAddBacklog={addBacklog}
          onClose={() => setWizardOpen(false)}
        />
      ) : null}

      <MoodSliders mentalState={week.mentalState} physicalState={week.physicalState} onChange={saveWeekMeta} />

      <div className="space-y-4">
        {week.days
          .slice()
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map((day) => (
            <DayCard
              key={day.id}
              isoWeek={isoWeek}
              dayOfWeek={day.dayOfWeek}
              day={day}
              tasks={week.tasks.filter((t) => t.kind === 'DAY_AREA' && t.dayId === day.id)}
              projects={projects}
              areas={areas}
              tags={tags}
              isToday={isoWeek === weekIsoOfToday && day.dayOfWeek === todayDow}
              capacityMinutes={dailyCapacityMinutes}
              onAddTask={(areaId, text) => addTask('DAY_AREA', text, { dayOfWeek: day.dayOfWeek, areaId })}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onReorderTasks={reorderTasks}
              onStarChange={(v) => saveStar(day.dayOfWeek, v)}
              {...exportProps}
              {...calendarProps}
            />
          ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PriorityListSection
          title={t.planWeekClient.priorityActionsTitle}
          tasks={priorityTasks}
          projects={projects}
          tags={tags}
          onAdd={(text) => addTask('PRIORITY_ACTION', text)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          {...exportProps}
          {...calendarProps}
        />
        <PriorityListSection
          title={t.planWeekClient.callsTitle}
          tasks={callTasks}
          projects={projects}
          tags={tags}
          onAdd={(text) => addTask('CALL', text)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          {...exportProps}
          {...calendarProps}
        />
      </div>

      <ProjectFocusPicker projects={projects} focusedIds={focusIds} onToggle={toggleProjectFocus} />

      <ObjectivesForm week={week} onSave={saveWeekMeta} />

      <BandejaSummaryLink pendingCount={countPendingProcess(inbox)} />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-base-muted">{t.planWeekClient.weekHabits}</h3>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <HabitGrid habits={habits} completions={week.habitCompletions} onToggle={toggleHabit} mode="week" todayDow={todayDow} />
        </div>
      </div>

      <EvaluationForm
        week={week}
        projects={projects}
        pendingTasks={week.tasks.filter((t) => !t.done)}
        onSave={saveWeekMeta}
        onAddAndTag={addAndTag}
      />
    </div>
  );
}

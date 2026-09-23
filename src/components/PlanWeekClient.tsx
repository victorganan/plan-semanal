'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { currentIsoWeek } from '@/lib/week';
import { useToast } from '@/components/Toast';
import type { WeekFull, Habit, ProjectWithAreaAndCollaborators, Area, TaskWithProject } from '@/types';
import { DayCard } from '@/components/DayCard';
import { HabitGrid } from '@/components/HabitGrid';
import { MoodSliders } from '@/components/MoodSliders';
import { ObjectivesForm, EvaluationForm } from '@/components/WeekMetaForm';
import { PriorityListSection } from '@/components/PriorityListSection';
import { ProjectFocusPicker } from '@/components/ProjectFocusPicker';
import { InboxList } from '@/components/InboxList';
import { EisenhowerMatrix } from '@/components/EisenhowerMatrix';
import { PlanningWizard } from '@/components/PlanningWizard';
import { DayCloseRitual } from '@/components/DayCloseRitual';
import { WeekNav } from '@/components/WeekNav';
import { DayNav } from '@/components/DayNav';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { DAY_NAMES, dateForDayOfWeek, addWeeks } from '@/lib/week';

interface Props {
  initialWeek: WeekFull;
  initialInbox: TaskWithProject[];
  habits: Habit[];
  projects: ProjectWithAreaAndCollaborators[];
  areas: Area[];
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
  const router = useRouter();
  const weekIsoOfToday = currentIsoWeek();

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
      done: false,
      priority: 'MEDIUM',
      durationMinutes: null,
      quadrant: null,
      assignedTo: null,
      isTop3: false,
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
          t.id === optimistic.id ? { ...created, project: null, area: optimisticArea, subtasks: [], recurringTemplate: null } : t
        ),
      }));
    } catch {
      setWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== optimistic.id) }));
      showToast('No se pudo crear la tarea', 'error');
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
      done: false,
      priority: 'MEDIUM',
      durationMinutes: null,
      quadrant: null,
      assignedTo: null,
      isTop3: false,
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
        prev.map((t) => (t.id === optimistic.id ? { ...created, project: null, area: null, subtasks: [], recurringTemplate: null } : t))
      );
    } catch {
      setInbox((prev) => prev.filter((t) => t.id !== optimistic.id));
      showToast('No se pudo guardar en la bandeja de entrada', 'error');
    }
  }

  async function updateTask(id: string, patch: Record<string, unknown>) {
    const found = findTask(id);
    if (!found) return;
    const { location, task: previous } = found;

    const promotedOut = location === 'inbox' && patch.kind && patch.kind !== 'BACKLOG';
    const project = 'projectId' in patch ? projects.find((p) => p.id === patch.projectId) ?? null : previous.project;
    const optimisticTask = { ...previous, ...patch, project } as TaskWithProject;

    if (promotedOut) {
      // Sale de la bandeja de entrada; si pertenece a la semana que se está viendo, se añade ahí.
      setInbox((prev) => prev.filter((t) => t.id !== id));
      if (patch.isoWeek === isoWeek) {
        setWeek((w) => ({ ...w, tasks: [...w.tasks, optimisticTask] }));
      }
    } else if (location === 'week') {
      setWeek((w) => ({ ...w, tasks: w.tasks.map((t) => (t.id === id ? optimisticTask : t)) }));
    } else {
      setInbox((prev) => prev.map((t) => (t.id === id ? optimisticTask : t)));
    }

    try {
      await api.patch(`/api/tasks/${id}`, patch);
      if (promotedOut && patch.isoWeek === isoWeek) await hardRefresh();
    } catch (err) {
      if (promotedOut) {
        setInbox((prev) => [...prev, previous]);
        setWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== id) }));
      } else if (location === 'week') {
        setWeek((w) => ({ ...w, tasks: w.tasks.map((t) => (t.id === id ? previous : t)) }));
      } else {
        setInbox((prev) => prev.map((t) => (t.id === id ? previous : t)));
      }
      showToast(err instanceof ApiError ? err.message : 'No se pudo guardar el cambio', 'error');
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
      showToast('No se pudo eliminar la tarea', 'error');
    }
  }

  async function exportTodoist(id: string) {
    try {
      await api.post('/api/integrations/todoist/export', { taskId: id });
      showToast('Tarea exportada a Todoist');
    } catch {
      showToast('No se pudo exportar a Todoist', 'error');
    }
  }

  async function createCalendarEvent(id: string) {
    try {
      await api.post('/api/integrations/calendar/create-event', { taskId: id });
      showToast('Evento creado correctamente en Google Calendar');
    } catch {
      showToast('No se pudo crear el evento en Calendar', 'error');
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
      showToast('No se pudo guardar el hábito', 'error');
    }
  }

  // ---------- Semana: estado, objetivos, evaluación, estrellas ----------

  async function saveWeekMeta(patch: Record<string, unknown>) {
    setWeek((w) => ({ ...w, ...patch }));
    try {
      await api.patch(`/api/weeks/${isoWeek}`, patch);
    } catch {
      showToast('No se pudo guardar', 'error');
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
      showToast('No se pudo guardar la valoración', 'error');
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
      showToast('No se pudo guardar el diario', 'error');
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
      done: false,
      priority: 'MEDIUM',
      durationMinutes: null,
      quadrant: null,
      assignedTo: null,
      isTop3: false,
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
        prev.map((t) => (t.id === id ? { ...created, project: null, area: null, subtasks: [], recurringTemplate: null } : t))
      );
      setWeek((w) => ({ ...w, [field]: w[field].map((x: string) => (x === id ? created.id : x)) }));
      await api.patch(`/api/weeks/${isoWeek}`, { [field]: week[field]?.map((x) => (x === id ? created.id : x)) ?? [created.id] });
    } catch {
      setInbox((prev) => prev.filter((t) => t.id !== id));
      setWeek((w) => ({ ...w, [field]: (w[field] ?? []).filter((x: string) => x !== id) }));
      showToast('No se pudo crear la tarea', 'error');
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
      showToast('No se pudo actualizar el foco de proyectos', 'error');
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
            <h1 className="text-2xl font-semibold">{isViewingToday ? 'Hoy' : DAY_NAMES[viewDow]}</h1>
            <p className="text-sm text-base-muted">
              {viewDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setWizardOpen(true)}
              className="rounded-full border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
            >
              ✨ Planificar la semana
            </button>
            <button
              onClick={() => setCloseRitualOpen(true)}
              className="rounded-full border border-base-border px-3 py-1.5 text-sm font-medium hover:bg-base-border/40"
            >
              🌙 Cerrar el día
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
            dayLabel={isViewingToday ? 'hoy' : `el ${DAY_NAMES[viewDow].toLowerCase()}`}
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
          isToday={isViewingToday}
          capacityMinutes={dailyCapacityMinutes}
          onAddTask={(areaId, text) => addTask('DAY_AREA', text, { dayOfWeek: viewDow, areaId })}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onStarChange={(v) => saveStar(viewDow, v)}
          {...exportProps}
          {...calendarProps}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-base-muted">
              {isViewingToday ? 'Hábitos de hoy' : `Hábitos del ${DAY_NAMES[viewDow].toLowerCase()}`}
            </h3>
            <HabitGrid habits={habits} completions={week.habitCompletions} onToggle={toggleHabit} mode="today" todayDow={viewDow} />
          </div>
          <div className="space-y-4">
            <PriorityListSection
              title="Acciones prioritarias / No olvidar"
              tasks={priorityTasks}
              projects={projects}
              onAdd={(text) => addTask('PRIORITY_ACTION', text)}
              onUpdate={updateTask}
              onDelete={deleteTask}
              {...exportProps}
              {...calendarProps}
            />
            <PriorityListSection
              title="Llamadas"
              tasks={callTasks}
              projects={projects}
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
        <h1 className="text-2xl font-semibold">Semana</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setWizardOpen(true)}
            className="rounded-full border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
          >
            ✨ Asistente de planificación
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

      <EisenhowerMatrix
        tasks={week.tasks}
        projects={projects}
        calendarConnected={calendarConnected}
        onUpdate={updateTask}
        onDelete={deleteTask}
        {...calendarProps}
      />

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
              isToday={isoWeek === weekIsoOfToday && day.dayOfWeek === todayDow}
              capacityMinutes={dailyCapacityMinutes}
              onAddTask={(areaId, text) => addTask('DAY_AREA', text, { dayOfWeek: day.dayOfWeek, areaId })}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onStarChange={(v) => saveStar(day.dayOfWeek, v)}
              {...exportProps}
              {...calendarProps}
            />
          ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PriorityListSection
          title="Acciones prioritarias / No olvidar"
          tasks={priorityTasks}
          projects={projects}
          onAdd={(text) => addTask('PRIORITY_ACTION', text)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          {...exportProps}
          {...calendarProps}
        />
        <PriorityListSection
          title="Llamadas"
          tasks={callTasks}
          projects={projects}
          onAdd={(text) => addTask('CALL', text)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          {...exportProps}
          {...calendarProps}
        />
      </div>

      <ProjectFocusPicker projects={projects} focusedIds={focusIds} onToggle={toggleProjectFocus} />

      <ObjectivesForm week={week} onSave={saveWeekMeta} />

      <InboxList tasks={inbox} projects={projects} areas={areas} currentIsoWeek={isoWeek} onAdd={addBacklog} onUpdate={updateTask} onDelete={deleteTask} />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-base-muted">Hábitos (lunes a viernes)</h3>
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

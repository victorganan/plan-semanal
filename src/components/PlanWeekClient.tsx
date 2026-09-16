'use client';

import { useCallback, useState } from 'react';
import { api } from '@/lib/api-client';
import { currentIsoWeek } from '@/lib/week';
import type { WeekFull, Habit, Project } from '@/types';
import { DayCard } from '@/components/DayCard';
import { HabitGrid } from '@/components/HabitGrid';
import { MoodSliders } from '@/components/MoodSliders';
import { ObjectivesForm, MindDumpForm, EvaluationForm } from '@/components/WeekMetaForm';
import { PriorityListSection } from '@/components/PriorityListSection';
import { ProjectFocusPicker } from '@/components/ProjectFocusPicker';
import { WeekNav } from '@/components/WeekNav';

interface Props {
  initialWeek: WeekFull;
  habits: Habit[];
  projects: Project[];
  isoWeek: string;
  mode: 'today' | 'week';
  todayDow: number;
  todoistConnected: boolean;
  calendarConnected: boolean;
}

export function PlanWeekClient({
  initialWeek,
  habits,
  projects,
  isoWeek,
  mode,
  todayDow,
  todoistConnected,
  calendarConnected,
}: Props) {
  const [week, setWeek] = useState(initialWeek);
  const weekIsoOfToday = currentIsoWeek();

  const refresh = useCallback(async () => {
    const fresh = await api.get(`/api/weeks/${isoWeek}`);
    setWeek(fresh);
  }, [isoWeek]);

  async function addTask(
    kind: 'DAY_AREA' | 'PRIORITY_ACTION' | 'CALL',
    text: string,
    extra?: { dayOfWeek?: number; area?: string }
  ) {
    await api.post('/api/tasks', { isoWeek, kind, text, ...extra });
    await refresh();
  }

  async function updateTask(id: string, patch: Record<string, unknown>) {
    await api.patch(`/api/tasks/${id}`, patch);
    await refresh();
  }

  async function deleteTask(id: string) {
    await api.delete(`/api/tasks/${id}`);
    await refresh();
  }

  async function exportTodoist(id: string) {
    await api.post('/api/integrations/todoist/export', { taskId: id });
  }

  async function createCalendarEvent(id: string) {
    await api.post('/api/integrations/calendar/create-event', { taskId: id });
  }

  async function toggleHabit(habitId: string, dayOfWeek: number, done: boolean) {
    await api.patch(`/api/habits/${habitId}/completions`, { isoWeek, dayOfWeek, done });
    await refresh();
  }

  async function saveWeekMeta(patch: Record<string, unknown>) {
    await api.patch(`/api/weeks/${isoWeek}`, patch);
  }

  async function saveStar(dayOfWeek: number, v: number) {
    await api.patch(`/api/weeks/${isoWeek}`, { days: [{ dayOfWeek, starRating: v === 0 ? null : v }] });
    await refresh();
  }

  async function toggleProjectFocus(projectId: string, focused: boolean) {
    if (focused) await api.post(`/api/weeks/${isoWeek}/project-focus`, { projectId });
    else await api.delete(`/api/weeks/${isoWeek}/project-focus`, { projectId });
    await refresh();
  }

  const priorityTasks = week.tasks.filter((t) => t.kind === 'PRIORITY_ACTION');
  const callTasks = week.tasks.filter((t) => t.kind === 'CALL');
  const focusIds = week.projectFocus.map((f) => f.projectId);

  const exportProps = todoistConnected ? { onExportTodoist: exportTodoist } : {};
  const calendarProps = calendarConnected ? { onCreateCalendarEvent: createCalendarEvent } : {};

  if (mode === 'today') {
    const day = week.days.find((d) => d.dayOfWeek === todayDow);
    const dayTasks = week.tasks.filter((t) => t.kind === 'DAY_AREA' && t.dayId === day?.id);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Hoy</h1>
            <p className="text-sm text-base-muted">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <MoodSliders mentalState={week.mentalState} physicalState={week.physicalState} onChange={saveWeekMeta} />
        </div>

        <DayCard
          isoWeek={isoWeek}
          dayOfWeek={todayDow}
          day={day}
          tasks={dayTasks}
          projects={projects}
          isToday
          onAddTask={(area, text) => addTask('DAY_AREA', text, { dayOfWeek: todayDow, area })}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onStarChange={(v) => saveStar(todayDow, v)}
          {...exportProps}
          {...calendarProps}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-base-muted">Hábitos de hoy</h3>
            <HabitGrid habits={habits} completions={week.habitCompletions} onToggle={toggleHabit} mode="today" todayDow={todayDow} />
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
        <WeekNav isoWeek={isoWeek} />
      </div>

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
              isToday={isoWeek === weekIsoOfToday && day.dayOfWeek === todayDow}
              onAddTask={(area, text) => addTask('DAY_AREA', text, { dayOfWeek: day.dayOfWeek, area })}
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
      <MindDumpForm week={week} onSave={saveWeekMeta} />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-base-muted">Hábitos (lunes a viernes)</h3>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <HabitGrid habits={habits} completions={week.habitCompletions} onToggle={toggleHabit} mode="week" todayDow={todayDow} />
        </div>
      </div>

      <EvaluationForm week={week} onSave={saveWeekMeta} />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { api, describeApiError } from '@/lib/api-client';
import { currentIsoWeek } from '@/lib/week';
import { useToast } from '@/components/Toast';
import { useInboxCapture } from '@/components/InboxCaptureContext';
import { InboxList } from '@/components/InboxList';
import { FocusMode } from '@/components/FocusMode';
import type { Area, ProjectWithAreaAndCollaborators, Tag, TaskWithProject } from '@/types';
import { text as t } from '@/i18n/es';

interface Props {
  initialInbox: TaskWithProject[];
  projects: ProjectWithAreaAndCollaborators[];
  areas: Area[];
  tags: Tag[];
  calendarConnected: boolean;
}

function tempId() {
  return `tmp_${Math.random().toString(36).slice(2)}`;
}

// Versión standalone de la Bandeja (página propia, no ligada a una semana):
// mantiene su propio estado optimista sobre initialInbox, igual de simple
// que el de PlanWeekClient pero sin la lógica de mover tareas dentro/fuera
// de `week.tasks` (aquí una tarea que deja de ser BACKLOG simplemente sale
// de la lista, no hay otro sitio al que añadirla en esta página).
export function BandejaClient({ initialInbox, projects, areas, tags, calendarConnected }: Props) {
  const [inbox, setInbox] = useState(initialInbox);
  const [focusTask, setFocusTask] = useState<{ id: string; text: string } | null>(null);
  const { showToast } = useToast();
  const { subscribe } = useInboxCapture();
  const isoWeek = currentIsoWeek();

  useEffect(() => subscribe((task) => setInbox((prev) => [...prev, task])), [subscribe]);

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
      calendarEventId: null,
      desiredOutcome: null,
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
        prev.map((task) => (task.id === optimistic.id ? { ...created, project: null, area: null, subtasks: [], recurringTemplate: null, tags: [] } : task))
      );
    } catch (err) {
      setInbox((prev) => prev.filter((task) => task.id !== optimistic.id));
      showToast(describeApiError(err, t.planWeekClient.saveInboxError), 'error');
    }
  }

  async function updateTask(id: string, patch: Record<string, unknown>) {
    const previous = inbox.find((task) => task.id === id);
    if (!previous) return;
    const leavesInbox = typeof patch.kind === 'string' && patch.kind !== 'BACKLOG';
    const project = 'projectId' in patch ? projects.find((p) => p.id === patch.projectId) ?? null : previous.project;
    const optimistic = { ...previous, ...patch, project } as TaskWithProject;

    if (leavesInbox) setInbox((prev) => prev.filter((task) => task.id !== id));
    else setInbox((prev) => prev.map((task) => (task.id === id ? optimistic : task)));

    try {
      await api.patch(`/api/tasks/${id}`, patch);
    } catch (err) {
      if (leavesInbox) setInbox((prev) => [...prev, previous]);
      else setInbox((prev) => prev.map((task) => (task.id === id ? previous : task)));
      showToast(describeApiError(err, t.planWeekClient.saveChangeError), 'error');
    }
  }

  async function deleteTask(id: string) {
    const previous = inbox.find((task) => task.id === id);
    if (!previous) return;
    setInbox((prev) => prev.filter((task) => task.id !== id));
    try {
      await api.delete(`/api/tasks/${id}`);
    } catch (err) {
      setInbox((prev) => [...prev, previous]);
      showToast(describeApiError(err, t.planWeekClient.deleteTaskError), 'error');
    }
  }

  function startFocus(id: string) {
    const task = inbox.find((t) => t.id === id);
    if (task) setFocusTask({ id: task.id, text: task.text });
  }

  async function createCalendarEvent(id: string) {
    try {
      await api.post('/api/integrations/calendar/create-event', { taskId: id });
      showToast(t.planWeekClient.calendarEventCreated);
    } catch (err) {
      showToast(describeApiError(err, t.planWeekClient.calendarEventError), 'error');
    }
  }

  return (
    <div className="space-y-6">
      {focusTask ? (
        <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onTaskDone={() => updateTask(focusTask.id, { done: true })} />
      ) : null}
      <h1 className="text-2xl font-semibold">{t.nav.bandeja}</h1>
      <InboxList
        tasks={inbox}
        projects={projects}
        areas={areas}
        tags={tags}
        currentIsoWeek={isoWeek}
        onAdd={addBacklog}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onStartFocus={startFocus}
        {...(calendarConnected ? { onCreateCalendarEvent: createCalendarEvent } : {})}
      />
    </div>
  );
}

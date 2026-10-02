'use client';

import { useState } from 'react';
import { api, describeApiError } from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { EisenhowerMatrix } from '@/components/EisenhowerMatrix';
import type { TaskWithProject, ProjectWithAreaAndCollaborators } from '@/types';

interface Props {
  initialTasks: TaskWithProject[];
  projects: ProjectWithAreaAndCollaborators[];
  calendarConnected: boolean;
}

export function HerramientasMatrizClient({ initialTasks, projects, calendarConnected }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const { showToast } = useToast();

  async function updateTask(id: string, patch: Record<string, unknown>) {
    const previous = tasks.find((t) => t.id === id);
    if (!previous) return;
    const project = 'projectId' in patch ? projects.find((p) => p.id === patch.projectId) ?? null : previous.project;
    const optimisticTask = { ...previous, ...patch, project } as TaskWithProject;
    setTasks((prev) => prev.map((t) => (t.id === id ? optimisticTask : t)));
    try {
      await api.patch(`/api/tasks/${id}`, patch);
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === id ? previous : t)));
      showToast(describeApiError(err, 'No se pudo guardar el cambio'), 'error');
    }
  }

  async function deleteTask(id: string) {
    const previous = tasks.find((t) => t.id === id);
    if (!previous) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.delete(`/api/tasks/${id}`);
    } catch (err) {
      setTasks((prev) => [...prev, previous]);
      showToast(describeApiError(err, 'No se pudo eliminar la tarea'), 'error');
    }
  }

  async function createCalendarEvent(id: string) {
    try {
      await api.post('/api/integrations/calendar/create-event', { taskId: id });
      showToast('Evento creado correctamente en Google Calendar');
    } catch (err) {
      showToast(describeApiError(err, 'No se pudo crear el evento en Calendar'), 'error');
    }
  }

  return (
    <EisenhowerMatrix
      tasks={tasks}
      calendarConnected={calendarConnected}
      onUpdate={updateTask}
      onDelete={deleteTask}
      {...(calendarConnected ? { onCreateCalendarEvent: createCalendarEvent } : {})}
      defaultOpen
    />
  );
}

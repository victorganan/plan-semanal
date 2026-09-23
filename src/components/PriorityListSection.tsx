import { AddTaskInline } from '@/components/AddTaskInline';
import { TaskCard } from '@/components/TaskCard';
import type { ProjectWithAreaAndCollaborators, TaskWithProject } from '@/types';

interface Props {
  title: string;
  tasks: TaskWithProject[];
  projects: ProjectWithAreaAndCollaborators[];
  onAdd: (text: string) => Promise<void>;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onExportTodoist?: (id: string) => Promise<void>;
  onCreateCalendarEvent?: (id: string) => Promise<void>;
}

export function PriorityListSection({ title, tasks, projects, onAdd, onUpdate, onDelete, onExportTodoist, onCreateCalendarEvent }: Props) {
  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            projects={projects}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onExportTodoist={onExportTodoist}
            onCreateCalendarEvent={onCreateCalendarEvent}
          />
        ))}
        {tasks.length === 0 ? <p className="text-sm text-base-muted">Nada por aquí todavía.</p> : null}
      </div>
      <div className="mt-2 border-t border-base-border pt-2">
        <AddTaskInline onAdd={onAdd} placeholder="Añadir…" />
      </div>
    </div>
  );
}

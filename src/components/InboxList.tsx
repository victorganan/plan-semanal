import { AddTaskInline } from '@/components/AddTaskInline';
import { TaskCard } from '@/components/TaskCard';
import type { Area, Project, TaskWithProject } from '@/types';

interface Props {
  tasks: TaskWithProject[];
  projects: Project[];
  areas: Area[];
  currentIsoWeek: string;
  onAdd: (text: string) => Promise<void>;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function InboxList({ tasks, projects, areas, currentIsoWeek, onAdd, onUpdate, onDelete }: Props) {
  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-1 text-sm font-semibold">Vaciado de mente / Bandeja de entrada</h3>
      <p className="mb-3 text-xs text-base-muted">
        Todo lo que no quieres olvidar. Queda aquí hasta que decidas moverlo a un día concreto.
      </p>
      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            projects={projects}
            areas={areas}
            onUpdate={onUpdate}
            onDelete={onDelete}
            currentIsoWeek={currentIsoWeek}
          />
        ))}
        {tasks.length === 0 ? <p className="text-sm text-base-muted">Vacía por ahora.</p> : null}
      </div>
      <div className="mt-2 border-t border-base-border pt-2">
        <AddTaskInline onAdd={onAdd} placeholder="Anota algo que no quieres olvidar…" />
      </div>
    </div>
  );
}

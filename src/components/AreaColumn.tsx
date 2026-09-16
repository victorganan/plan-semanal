import { AddTaskInline } from '@/components/AddTaskInline';
import { TaskCard } from '@/components/TaskCard';
import { AREA_LABELS } from '@/types';
import type { Project, TaskWithProject } from '@/types';

const AREA_BAR: Record<string, string> = {
  SERVILIA: 'bg-area-servilia',
  GESTIONA: 'bg-area-gestiona',
  PERSONAL: 'bg-area-personal',
};

interface Props {
  area: string;
  tasks: TaskWithProject[];
  projects: Project[];
  onAdd: (area: string, text: string) => Promise<void>;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onExportTodoist?: (id: string) => Promise<void>;
  onCreateCalendarEvent?: (id: string) => Promise<void>;
}

export function AreaColumn({ area, tasks, projects, onAdd, onUpdate, onDelete, onExportTodoist, onCreateCalendarEvent }: Props) {
  return (
    <div className="rounded-card border border-base-border bg-base-bg/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${AREA_BAR[area]}`} />
        <h3 className="text-sm font-semibold tracking-wide">{AREA_LABELS[area]}</h3>
      </div>
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
            showRecurrence
          />
        ))}
      </div>
      <div className="mt-2 border-t border-base-border pt-2">
        <AddTaskInline onAdd={(text) => onAdd(area, text)} placeholder="Añadir tarea…" />
      </div>
    </div>
  );
}

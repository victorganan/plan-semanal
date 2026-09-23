import { AreaColumn } from '@/components/AreaColumn';
import { StarRating } from '@/components/StarRating';
import { DAY_NAMES, dateForDayOfWeek } from '@/lib/week';
import type { Area, Day, Project, TaskWithProject } from '@/types';
import clsx from 'clsx';

interface Props {
  isoWeek: string;
  dayOfWeek: number;
  day: Day | undefined;
  tasks: TaskWithProject[];
  projects: Project[];
  areas: Area[];
  isToday: boolean;
  onAddTask: (areaId: string, text: string) => Promise<void>;
  onUpdateTask: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onStarChange: (v: number) => Promise<void>;
  onExportTodoist?: (id: string) => Promise<void>;
  onCreateCalendarEvent?: (id: string) => Promise<void>;
}

export function DayCard({
  isoWeek,
  dayOfWeek,
  day,
  tasks,
  projects,
  areas,
  isToday,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onStarChange,
  onExportTodoist,
  onCreateCalendarEvent,
}: Props) {
  const date = dateForDayOfWeek(isoWeek, dayOfWeek);
  const dateLabel = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  return (
    <section className={clsx('rounded-card border p-4', isToday ? 'border-accent bg-accent/5' : 'border-base-border bg-base-surface')}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">
          {DAY_NAMES[dayOfWeek]} <span className="font-normal text-base-muted">· {dateLabel}</span>
          {isToday ? <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-white">Hoy</span> : null}
        </h2>
        <StarRating value={day?.starRating ?? null} onChange={onStarChange} />
      </div>
      {areas.length === 0 ? (
        <p className="text-sm text-base-muted">Crea un área en Tu espacio para empezar a añadir tareas del día.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <AreaColumn
              key={area.id}
              area={area}
              dayOfWeek={dayOfWeek}
              isoWeek={isoWeek}
              tasks={tasks.filter((t) => t.areaId === area.id)}
              projects={projects}
              onAdd={onAddTask}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onExportTodoist={onExportTodoist}
              onCreateCalendarEvent={onCreateCalendarEvent}
            />
          ))}
        </div>
      )}
    </section>
  );
}

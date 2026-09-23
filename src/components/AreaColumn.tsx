'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { AddTaskInline } from '@/components/AddTaskInline';
import { TaskCard } from '@/components/TaskCard';
import { areaBgClass } from '@/types';
import type { Area, Project, TaskWithProject } from '@/types';

interface Props {
  area: Area;
  dayOfWeek: number;
  isoWeek: string;
  tasks: TaskWithProject[];
  projects: Project[];
  onAdd: (areaId: string, text: string) => Promise<void>;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onExportTodoist?: (id: string) => Promise<void>;
  onCreateCalendarEvent?: (id: string) => Promise<void>;
}

export function AreaColumn({
  area,
  dayOfWeek,
  isoWeek,
  tasks,
  projects,
  onAdd,
  onUpdate,
  onDelete,
  onExportTodoist,
  onCreateCalendarEvent,
}: Props) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) onUpdate(taskId, { kind: 'DAY_AREA', isoWeek, dayOfWeek, areaId: area.id });
      }}
      className={clsx(
        'rounded-card border p-3 transition',
        dragOver ? 'border-accent bg-accent/5' : 'border-base-border bg-base-bg/50'
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={clsx('h-2 w-2 rounded-full', areaBgClass(area.colorIndex))} />
        <h3 className="text-sm font-semibold tracking-wide">{area.name}</h3>
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
            currentIsoWeek={isoWeek}
          />
        ))}
      </div>
      <div className="mt-2 border-t border-base-border pt-2">
        <AddTaskInline onAdd={(text) => onAdd(area.id, text)} placeholder="Añadir tarea…" />
      </div>
    </div>
  );
}

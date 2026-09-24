'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { AddTaskInline } from '@/components/AddTaskInline';
import { TaskCard } from '@/components/TaskCard';
import { areaBgClass } from '@/types';
import { dateForDayOfWeek } from '@/lib/week';
import { text } from '@/i18n/es';
import type { Area, ProjectWithAreaAndCollaborators, Tag, TaskWithProject } from '@/types';

interface Props {
  area: Area;
  dayOfWeek: number;
  isoWeek: string;
  tasks: TaskWithProject[];
  projects: ProjectWithAreaAndCollaborators[];
  tags?: Tag[];
  onAdd: (areaId: string, text: string) => Promise<void>;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
  onExportTodoist?: (id: string) => Promise<void>;
  onCreateCalendarEvent?: (id: string) => Promise<void>;
}

export function AreaColumn({
  area,
  dayOfWeek,
  isoWeek,
  tasks,
  projects,
  tags,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  onExportTodoist,
  onCreateCalendarEvent,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);

  function handleDropOnColumn(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    setDropTarget(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    if (tasks.some((t) => t.id === taskId)) {
      // Ya estaba en esta columna: soltarlo en el hueco vacío la manda al final.
      onReorder([...tasks.filter((t) => t.id !== taskId).map((t) => t.id), taskId]);
    } else {
      onUpdate(taskId, { kind: 'DAY_AREA', isoWeek, dayOfWeek, areaId: area.id });
    }
  }

  function handleDropOnTask(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setDropTarget(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId || taskId === targetId) return;

    if (!tasks.some((t) => t.id === taskId)) {
      // Viene de otro día/área.
      onUpdate(taskId, { kind: 'DAY_AREA', isoWeek, dayOfWeek, areaId: area.id });
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
    const withoutDragged = tasks.filter((t) => t.id !== taskId).map((t) => t.id);
    const targetIndex = withoutDragged.indexOf(targetId);
    const insertAt = position === 'before' ? targetIndex : targetIndex + 1;
    withoutDragged.splice(insertAt, 0, taskId);
    onReorder(withoutDragged);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDropOnColumn}
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
          <div
            key={t.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const position = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
              setDropTarget({ id: t.id, position });
            }}
            onDrop={(e) => handleDropOnTask(e, t.id)}
            className={clsx(
              'relative',
              dropTarget?.id === t.id &&
                dropTarget.position === 'before' &&
                'before:absolute before:-top-1 before:left-0 before:right-0 before:h-0.5 before:rounded-full before:bg-accent',
              dropTarget?.id === t.id &&
                dropTarget.position === 'after' &&
                'after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-accent'
            )}
          >
            <TaskCard
              task={t}
              projects={projects}
              tags={tags}
              referenceDate={dateForDayOfWeek(isoWeek, dayOfWeek)}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onExportTodoist={onExportTodoist}
              onCreateCalendarEvent={onCreateCalendarEvent}
              showRecurrence
              currentIsoWeek={isoWeek}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-base-border pt-2">
        <AddTaskInline onAdd={(value) => onAdd(area.id, value)} placeholder={text.areaColumn.addPlaceholder} />
      </div>
    </div>
  );
}

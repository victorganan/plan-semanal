'use client';

import { useState } from 'react';
import { AreaColumn } from '@/components/AreaColumn';
import { StarRating } from '@/components/StarRating';
import { CapacityBar } from '@/components/CapacityBar';
import { Top3Today } from '@/components/Top3Today';
import { Top3SwapModal } from '@/components/Top3SwapModal';
import { DAY_NAMES, dateForDayOfWeek } from '@/lib/week';
import { summarizeLoad } from '@/lib/capacity';
import type { Area, Day, ProjectWithAreaAndCollaborators, Tag, TaskWithProject } from '@/types';
import { text } from '@/i18n/es';
import clsx from 'clsx';

interface Props {
  isoWeek: string;
  dayOfWeek: number;
  day: Day | undefined;
  tasks: TaskWithProject[];
  projects: ProjectWithAreaAndCollaborators[];
  areas: Area[];
  tags?: Tag[];
  isToday: boolean;
  capacityMinutes: number;
  bufferPercent: number;
  onAddTask: (areaId: string, text: string) => Promise<void>;
  onUpdateTask: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onReorderTasks: (orderedIds: string[]) => Promise<void>;
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
  tags,
  isToday,
  capacityMinutes,
  bufferPercent,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onStarChange,
  onExportTodoist,
  onCreateCalendarEvent,
}: Props) {
  const [pendingSwap, setPendingSwap] = useState<{ id: string; text: string } | null>(null);
  const [swapBusy, setSwapBusy] = useState(false);
  // Evita que un doble clic (o un clic sintético duplicado) sobre la misma
  // estrella dispare dos PATCH consecutivos: el segundo leería isTop3 ya
  // actualizado por el primero y lo revertiría al instante.
  const [pendingTop3, setPendingTop3] = useState<Set<string>>(new Set());

  const date = dateForDayOfWeek(isoWeek, dayOfWeek);
  const dateLabel = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const { plannedMinutes, unestimatedCount } = summarizeLoad(tasks);
  const top3Tasks = tasks.filter((t) => t.isTop3);

  async function handleToggleTop3(id: string, next: boolean) {
    if (pendingTop3.has(id)) return;
    setPendingTop3((prev) => new Set(prev).add(id));
    try {
      if (!next) {
        await onUpdateTask(id, { isTop3: false });
        return;
      }
      if (top3Tasks.length >= 3) {
        const task = tasks.find((t) => t.id === id);
        if (task) setPendingSwap({ id, text: task.text });
        return;
      }
      await onUpdateTask(id, { isTop3: true });
    } finally {
      setPendingTop3((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(id);
        return nextSet;
      });
    }
  }

  async function confirmSwap(outgoingId: string) {
    if (!pendingSwap) return;
    setSwapBusy(true);
    try {
      await onUpdateTask(outgoingId, { isTop3: false });
      await onUpdateTask(pendingSwap.id, { isTop3: true });
      setPendingSwap(null);
    } finally {
      setSwapBusy(false);
    }
  }

  return (
    <section className={clsx('rounded-card border p-4', isToday ? 'border-accent bg-accent/5' : 'border-base-border bg-base-surface')}>
      {pendingSwap ? (
        <Top3SwapModal
          currentTop3={top3Tasks}
          incomingTaskText={pendingSwap.text}
          busy={swapBusy}
          onSwap={confirmSwap}
          onCancel={() => setPendingSwap(null)}
        />
      ) : null}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          {DAY_NAMES[dayOfWeek]} <span className="font-normal text-base-muted">· {dateLabel}</span>
          {isToday ? <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-white">{text.dayCard.todayBadge}</span> : null}
        </h2>
        <div className="flex items-center gap-3">
          <CapacityBar
            plannedMinutes={plannedMinutes}
            capacityMinutes={capacityMinutes}
            bufferPercent={bufferPercent}
            unestimatedCount={unestimatedCount}
          />
          <StarRating value={day?.starRating ?? null} onChange={onStarChange} />
        </div>
      </div>
      <Top3Today
        tasks={top3Tasks}
        onToggleDone={(id, done) => onUpdateTask(id, { done })}
        onUnstar={(id) => handleToggleTop3(id, false)}
      />
      {areas.length === 0 ? (
        <p className="text-sm text-base-muted">{text.dayCard.noAreas}</p>
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
              tags={tags}
              onAdd={onAddTask}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onReorder={(orderedIds) => onReorderTasks(orderedIds)}
              onExportTodoist={onExportTodoist}
              onCreateCalendarEvent={onCreateCalendarEvent}
              onToggleTop3={handleToggleTop3}
              pendingTop3Ids={pendingTop3}
            />
          ))}
        </div>
      )}
    </section>
  );
}

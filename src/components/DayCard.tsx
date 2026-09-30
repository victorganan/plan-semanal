'use client';

import { AreaColumn } from '@/components/AreaColumn';
import { CapacityBar } from '@/components/CapacityBar';
import { Top3Today } from '@/components/Top3Today';
import { Top3SwapModal } from '@/components/Top3SwapModal';
import { useTop3Toggle } from '@/components/useTop3Toggle';
import { DAY_NAMES, dateForDayOfWeek } from '@/lib/week';
import { summarizeLoad } from '@/lib/capacity';
import type { Area, ProjectWithAreaAndCollaborators, Tag, TaskWithProject } from '@/types';
import { text } from '@/i18n/es';
import clsx from 'clsx';

interface Props {
  isoWeek: string;
  dayOfWeek: number;
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
  onExportTodoist?: (id: string) => Promise<void>;
  onCreateCalendarEvent?: (id: string) => Promise<void>;
  onStartFocus?: (id: string) => void;
  // Hoy (H9 de la auditoría UX): oculta la insignia "Hoy" y el borde de
  // acento (redundantes con el título de la página) y usa la versión
  // compacta de Las 3 del día (S5). En Semana siguen puestos: distinguir la
  // columna de hoy entre 7 sí aporta.
  focusMode?: boolean;
}

export function DayCard({
  isoWeek,
  dayOfWeek,
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
  onExportTodoist,
  onCreateCalendarEvent,
  onStartFocus,
  focusMode,
}: Props) {
  const { top3Tasks, pendingTop3, handleToggleTop3, pendingSwap, swapBusy, confirmSwap, cancelSwap } = useTop3Toggle(
    tasks,
    onUpdateTask
  );

  const date = dateForDayOfWeek(isoWeek, dayOfWeek);
  const dateLabel = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const { plannedMinutes, unestimatedCount } = summarizeLoad(tasks);

  const showTodayEmphasis = isToday && !focusMode;
  return (
    <section
      className={clsx('rounded-card border p-4', showTodayEmphasis ? 'border-accent bg-accent/5' : 'border-base-border bg-base-surface')}
    >
      {pendingSwap ? (
        <Top3SwapModal
          currentTop3={top3Tasks}
          incomingTaskText={pendingSwap.text}
          busy={swapBusy}
          onSwap={confirmSwap}
          onCancel={cancelSwap}
        />
      ) : null}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          {DAY_NAMES[dayOfWeek]} <span className="font-normal text-base-muted">· {dateLabel}</span>
          {showTodayEmphasis ? (
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-white">{text.dayCard.todayBadge}</span>
          ) : null}
        </h2>
        <CapacityBar
          plannedMinutes={plannedMinutes}
          capacityMinutes={capacityMinutes}
          bufferPercent={bufferPercent}
          unestimatedCount={unestimatedCount}
        />
      </div>
      <Top3Today
        tasks={top3Tasks}
        onToggleDone={(id, done) => onUpdateTask(id, { done })}
        onUnstar={(id) => handleToggleTop3(id, false)}
        compact={!focusMode}
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
              onStartFocus={onStartFocus}
              onToggleTop3={handleToggleTop3}
              pendingTop3Ids={pendingTop3}
              focusMode={focusMode}
            />
          ))}
        </div>
      )}
    </section>
  );
}

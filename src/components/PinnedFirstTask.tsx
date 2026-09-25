'use client';

import type { TaskWithProject } from '@/types';
import { text } from '@/i18n/es';

interface Props {
  task: TaskWithProject;
  candidateTasks: TaskWithProject[]; // tareas de hoy, para el selector "Cambiar"
  onToggleDone: (done: boolean) => Promise<void>;
  onChange: (taskId: string | null) => Promise<void>;
  onStart: () => void;
}

export function PinnedFirstTask({ task, candidateTasks, onToggleDone, onChange, onStart }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-card border border-accent bg-accent/10 px-4 py-2.5 text-sm">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-accent">{text.pinnedFirstTask.label}</span>
      <button
        onClick={() => onToggleDone(true)}
        aria-label={text.pinnedFirstTask.completeAriaLabel}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-accent text-transparent hover:bg-accent/20 hover:text-accent"
      >
        ✓
      </button>
      <span className="flex-1 truncate font-medium">{task.text}</span>
      <button onClick={onStart} className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
        {text.pinnedFirstTask.startButton}
      </button>
      <select
        value={task.id}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label={text.pinnedFirstTask.changeAriaLabel}
        className="shrink-0 rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs"
      >
        {candidateTasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.text}
          </option>
        ))}
      </select>
    </div>
  );
}

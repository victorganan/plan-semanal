'use client';

import clsx from 'clsx';
import { AREA_LABELS } from '@/types';
import type { Project } from '@/types';

export function ProjectFocusPicker({
  projects,
  focusedIds,
  onToggle,
}: {
  projects: Project[];
  focusedIds: string[];
  onToggle: (projectId: string, focused: boolean) => Promise<void>;
}) {
  const active = projects.filter((p) => p.status === 'ACTIVE');

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Proyectos en foco esta semana</h3>
      {active.length === 0 ? (
        <p className="text-sm text-base-muted">Crea proyectos en la sección Proyectos para poder enfocarlos aquí.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {active.map((p) => {
            const focused = focusedIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => onToggle(p.id, !focused)}
                className={clsx(
                  'rounded-full border px-3 py-1.5 text-sm transition',
                  focused ? 'border-accent bg-accent/10 text-accent' : 'border-base-border hover:bg-base-border/40'
                )}
              >
                {p.name} <span className="text-xs text-base-muted">· {AREA_LABELS[p.area]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

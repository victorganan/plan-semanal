'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { TaskWithProject } from '@/types';

const PRIORITY_ROWS = ['HIGH', 'MEDIUM', 'LOW'] as const;
const PRIORITY_ROW_LABELS: Record<string, string> = { HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baja' };

const DURATION_COLS = ['LT_HALF', 'HALF_TO_ONE', 'ONE_TO_TWO', 'GT_TWO', 'SIN_DEFINIR'] as const;
const DURATION_COL_LABELS: Record<string, string> = {
  LT_HALF: '<30min',
  HALF_TO_ONE: '30-60min',
  ONE_TO_TWO: '1-2h',
  GT_TWO: '>2h',
  SIN_DEFINIR: 'Sin definir',
};

function durationCol(minutes: number | null): (typeof DURATION_COLS)[number] {
  if (!minutes) return 'SIN_DEFINIR';
  if (minutes < 30) return 'LT_HALF';
  if (minutes <= 60) return 'HALF_TO_ONE';
  if (minutes <= 120) return 'ONE_TO_TWO';
  return 'GT_TWO';
}

export function EisenhowerMatrix({ tasks }: { tasks: TaskWithProject[] }) {
  const [open, setOpen] = useState(false);

  const relevant = tasks.filter((t) => t.kind !== 'BACKLOG' && !t.done);

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold">
        Matriz de prioridad × duración
        <span className="text-base-muted">{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-2 text-xs">
            <thead>
              <tr>
                <th className="w-24 text-left font-medium text-base-muted">Prioridad ↓ / Duración →</th>
                {DURATION_COLS.map((c) => (
                  <th key={c} className="text-left font-medium text-base-muted">
                    {DURATION_COL_LABELS[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRIORITY_ROWS.map((row) => (
                <tr key={row}>
                  <td className="align-top font-semibold text-base-text">{PRIORITY_ROW_LABELS[row]}</td>
                  {DURATION_COLS.map((col) => {
                    const cellTasks = relevant.filter((t) => t.priority === row && durationCol(t.durationMinutes) === col);
                    return (
                      <td
                        key={col}
                        className={clsx(
                          'min-h-[3rem] rounded-lg border border-base-border p-2 align-top',
                          row === 'HIGH' && (col === 'LT_HALF' || col === 'HALF_TO_ONE') && 'bg-priority-high/5',
                          row === 'LOW' && (col === 'ONE_TO_TWO' || col === 'GT_TWO') && 'bg-priority-low/5'
                        )}
                      >
                        <div className="space-y-1">
                          {cellTasks.map((t) => (
                            <div key={t.id} className="truncate rounded bg-base-bg px-1.5 py-0.5" title={t.text}>
                              {t.text}
                            </div>
                          ))}
                          {cellTasks.length === 0 ? <span className="text-base-muted">—</span> : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-base-muted">
            Solo tareas pendientes de esta semana. Prioridad alta + poca duración: hazlas ya. Prioridad baja + mucha duración: aplázalas o delégalas.
          </p>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { TaskWithProject } from '@/types';

interface Props {
  dayLabel: string;
  tasks: TaskWithProject[]; // tareas DAY_AREA de hoy
  tomorrowLabel: string;
  tomorrowTasks: TaskWithProject[] | null; // null si mañana cae en otra semana (no cargada)
  initialJournalNote: string;
  onSaveJournal: (note: string) => Promise<void>;
  onReplanPending: () => Promise<void>;
  onToggleTomorrowTop3: (id: string, next: boolean) => Promise<void>;
  onClose: () => void;
}

export function DayCloseRitual({
  dayLabel,
  tasks,
  tomorrowLabel,
  tomorrowTasks,
  initialJournalNote,
  onSaveJournal,
  onReplanPending,
  onToggleTomorrowTop3,
  onClose,
}: Props) {
  const [journal, setJournal] = useState(initialJournalNote);
  const [replanning, setReplanning] = useState(false);
  const [replanned, setReplanned] = useState(false);

  const done = tasks.filter((t) => t.done);
  const pending = tasks.filter((t) => !t.done);

  async function handleReplan() {
    setReplanning(true);
    try {
      await onReplanPending();
      setReplanned(true);
    } finally {
      setReplanning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-base-surface p-6 shadow-xl sm:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">🌙 Cerrar {dayLabel.toLowerCase()}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 text-base-muted hover:bg-base-border/40">
            ✕
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-muted">Lo hecho hoy</h3>
            {tasks.length === 0 ? (
              <p className="text-base-muted">No había tareas de día planificadas.</p>
            ) : (
              <p>
                <strong className="text-accent">{done.length}</strong> de {tasks.length} completadas.
              </p>
            )}
          </section>

          {pending.length > 0 ? (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-muted">
                Pendientes ({pending.length})
              </h3>
              <ul className="mb-2 space-y-1">
                {pending.map((t) => (
                  <li key={t.id} className="truncate text-base-text">
                    · {t.text}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleReplan}
                disabled={replanning || replanned}
                className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              >
                {replanned ? `Movidas a ${tomorrowLabel.toLowerCase()} ✓` : `Replanificar todo a ${tomorrowLabel.toLowerCase()} →`}
              </button>
            </section>
          ) : null}

          <section>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-base-muted">
              Una línea de diario
            </label>
            <textarea
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              onBlur={() => onSaveJournal(journal)}
              rows={2}
              placeholder="¿Qué te llevas de hoy?"
              className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            />
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-muted">
              Top 3 de {tomorrowLabel.toLowerCase()}
            </h3>
            {tomorrowTasks === null ? (
              <p className="text-base-muted">Mañana empieza una semana nueva — repásalo desde la vista Semana.</p>
            ) : tomorrowTasks.length === 0 ? (
              <p className="text-base-muted">Todavía no hay tareas planificadas para {tomorrowLabel.toLowerCase()}.</p>
            ) : (
              <div className="space-y-1.5">
                {tomorrowTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleTomorrowTop3(t.id, !t.isTop3)}
                      aria-label={t.isTop3 ? 'Quitar de Top 3' : 'Marcar como Top 3'}
                      className={clsx('shrink-0', t.isTop3 ? 'text-amber-500' : 'text-base-muted/50')}
                    >
                      {t.isTop3 ? '⭐' : '☆'}
                    </button>
                    <span className="flex-1 truncate">{t.text}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 flex justify-end border-t border-base-border pt-4">
          <button onClick={onClose} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white">
            Listo por hoy
          </button>
        </div>
      </div>
    </div>
  );
}

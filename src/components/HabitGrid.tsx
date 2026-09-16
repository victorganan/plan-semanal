'use client';

import clsx from 'clsx';
import type { Habit, HabitCompletion } from '@/types';

const DAYS_LV = ['L', 'M', 'X', 'J', 'V'];

interface Props {
  habits: Habit[];
  completions: HabitCompletion[];
  onToggle: (habitId: string, dayOfWeek: number, done: boolean) => Promise<void>;
  mode: 'today' | 'week';
  todayDow: number;
}

export function HabitGrid({ habits, completions, onToggle, mode, todayDow }: Props) {
  if (habits.length === 0) {
    return <p className="text-sm text-base-muted">Añade hábitos desde Ajustes para hacerles seguimiento aquí.</p>;
  }

  const isDone = (habitId: string, dow: number) => completions.some((c) => c.habitId === habitId && c.dayOfWeek === dow && c.done);

  if (mode === 'today' && todayDow <= 4) {
    return (
      <ul className="space-y-2">
        {habits.map((h) => {
          const done = isDone(h.id, todayDow);
          return (
            <li key={h.id}>
              <button
                onClick={() => onToggle(h.id, todayDow, !done)}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-card border border-base-border px-3 py-2 text-sm transition',
                  done ? 'bg-accent/10 text-accent' : 'hover:bg-base-border/30'
                )}
              >
                <span
                  className={clsx(
                    'flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs',
                    done ? 'border-accent bg-accent text-white' : 'border-base-border'
                  )}
                >
                  {done ? '✓' : ''}
                </span>
                {h.name}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  if (mode === 'today') {
    return <p className="text-sm text-base-muted">Los hábitos se siguen de lunes a viernes.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-base-muted">
            <th className="pb-2 pr-2 font-medium">Hábito</th>
            {DAYS_LV.map((d) => (
              <th key={d} className="px-1 pb-2 text-center font-medium">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {habits.map((h) => (
            <tr key={h.id} className="border-t border-base-border">
              <td className="py-2 pr-2">{h.name}</td>
              {DAYS_LV.map((_, dow) => {
                const done = isDone(h.id, dow);
                return (
                  <td key={dow} className="px-1 py-2 text-center">
                    <button
                      onClick={() => onToggle(h.id, dow, !done)}
                      aria-label={`${h.name} día ${dow}`}
                      className={clsx(
                        'mx-auto flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs',
                        done ? 'border-accent bg-accent text-white' : 'border-base-border hover:border-accent'
                      )}
                    >
                      {done ? '✓' : ''}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

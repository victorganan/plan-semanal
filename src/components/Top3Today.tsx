import clsx from 'clsx';
import type { TaskWithProject } from '@/types';
import { text } from '@/i18n/es';

interface Props {
  tasks: TaskWithProject[];
  title?: string;
  onToggleDone: (id: string, done: boolean) => void;
  onUnstar: (id: string) => void;
}

export function Top3Today({ tasks, title = text.top3.title, onToggleDone, onUnstar }: Props) {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-3 rounded-lg border border-amber-400/40 bg-amber-400/5 p-3">
      <p className="mb-2 text-xs font-semibold text-amber-600">🏆 {title}</p>
      <div className="space-y-1.5">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-2">
            <button
              onClick={() => onToggleDone(t.id, !t.done)}
              aria-label={text.top3.toggleDoneAriaLabel(t.done)}
              className={clsx(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-[10px] transition',
                t.done ? 'border-accent bg-accent text-white' : 'border-base-border text-transparent hover:border-accent'
              )}
            >
              ✓
            </button>
            <span className={clsx('flex-1 truncate text-sm', t.done && 'text-base-muted line-through')}>{t.text}</span>
            <button onClick={() => onUnstar(t.id)} aria-label={text.top3.unstarAriaLabel} className="text-xs text-base-muted hover:text-priority-high">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

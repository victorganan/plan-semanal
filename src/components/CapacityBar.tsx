import clsx from 'clsx';
import { formatDurationMinutes } from '@/types';
import { text } from '@/i18n/es';

export function CapacityBar({ plannedMinutes, capacityMinutes }: { plannedMinutes: number; capacityMinutes: number }) {
  if (plannedMinutes === 0) return null;

  const pct = capacityMinutes > 0 ? (plannedMinutes / capacityMinutes) * 100 : 0;
  const over = pct > 100;

  return (
    <div className="min-w-[9rem]">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-base-muted">
        <span>{text.capacityBar.plannedOf(formatDurationMinutes(plannedMinutes), formatDurationMinutes(capacityMinutes))}</span>
        {over ? <span className="font-semibold text-priority-high">{text.capacityBar.overloaded}</span> : null}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-border/50">
        <div
          className={clsx('h-full rounded-full transition-all', over ? 'bg-priority-high' : 'bg-accent')}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

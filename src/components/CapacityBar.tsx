import clsx from 'clsx';
import { formatDurationMinutes } from '@/types';
import { effectiveCapacity, loadColor } from '@/lib/capacity';
import { text } from '@/i18n/es';

interface Props {
  plannedMinutes: number;
  capacityMinutes: number;
  bufferPercent: number;
  unestimatedCount: number;
}

export function CapacityBar({ plannedMinutes, capacityMinutes, bufferPercent, unestimatedCount }: Props) {
  if (plannedMinutes === 0) return null;

  const capacity = effectiveCapacity(capacityMinutes, bufferPercent);
  const pct = capacity > 0 ? (plannedMinutes / capacity) * 100 : 0;
  const color = loadColor(pct);
  const free = Math.max(capacity - plannedMinutes, 0);

  return (
    <div className="group relative min-w-[9rem]">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-base-muted">
        <span>{text.capacityBar.plannedOf(formatDurationMinutes(plannedMinutes), formatDurationMinutes(capacity))}</span>
        {color === 'over' ? <span className="font-semibold text-priority-high">{text.capacityBar.overloaded}</span> : null}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-border/50">
        <div
          className={clsx(
            'h-full rounded-full transition-all',
            color === 'over' ? 'bg-priority-high' : color === 'warn' ? 'bg-priority-medium' : 'bg-accent'
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {unestimatedCount > 0 ? (
        <p className="mt-1 text-[10px] text-base-muted">{text.capacityBar.unestimatedWarning(unestimatedCount)}</p>
      ) : null}
      <div className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-56 space-y-0.5 rounded-lg border border-base-border bg-base-bg p-2 text-[11px] shadow-lg group-hover:block">
        <p>{text.capacityBar.tooltipCapacity(formatDurationMinutes(capacityMinutes), bufferPercent)}</p>
        <p>{text.capacityBar.tooltipEffective(formatDurationMinutes(capacity))}</p>
        <p>{text.capacityBar.tooltipPlanned(formatDurationMinutes(plannedMinutes))}</p>
        <p>{text.capacityBar.tooltipFree(formatDurationMinutes(free))}</p>
      </div>
    </div>
  );
}

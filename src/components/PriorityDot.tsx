const COLORS: Record<string, string> = {
  LOW: 'bg-priority-low',
  MEDIUM: 'bg-priority-medium',
  HIGH: 'bg-priority-high',
};

export function PriorityDot({ priority }: { priority: string }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${COLORS[priority] ?? 'bg-priority-low'}`} aria-hidden />;
}

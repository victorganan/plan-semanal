import type { Task, Day, Week, Habit, HabitCompletion, Project, WeekProjectFocus, Area } from '@prisma/client';

export type ProjectWithArea = Project & { area: Area };
export type TaskWithProject = Task & { project: ProjectWithArea | null; area: Area | null };

export type WeekFull = Week & {
  days: Day[];
  tasks: TaskWithProject[];
  habitCompletions: HabitCompletion[];
  projectFocus: (WeekProjectFocus & { project: ProjectWithArea })[];
};

export type { Task, Day, Week, Habit, HabitCompletion, Project, WeekProjectFocus, Area };

const AREA_PALETTE = ['bg-area-1', 'bg-area-2', 'bg-area-3', 'bg-area-4', 'bg-area-5', 'bg-area-6'];
const AREA_TEXT_PALETTE = ['text-area-1', 'text-area-2', 'text-area-3', 'text-area-4', 'text-area-5', 'text-area-6'];

export function areaBgClass(index: number): string {
  return AREA_PALETTE[index % AREA_PALETTE.length];
}

export function areaTextClass(index: number): string {
  return AREA_TEXT_PALETTE[index % AREA_TEXT_PALETTE.length];
}

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

export const DURATION_LABELS: Record<string, string> = {
  LT_HALF: '<0,5h',
  HALF_TO_ONE: '0,5-1h',
  ONE_TO_TWO: '1-2h',
  GT_TWO: '>2h',
};

export const RECURRENCE_LABELS: Record<string, string> = {
  NONE: 'Sin recurrencia',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  FOUR_WEEKLY: 'Cada 4 semanas',
};

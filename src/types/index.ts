import type { Task, Day, Week, Habit, HabitCompletion, Project, WeekProjectFocus } from '@prisma/client';

export type TaskWithProject = Task & { project: Project | null };

export type WeekFull = Week & {
  days: Day[];
  tasks: TaskWithProject[];
  habitCompletions: HabitCompletion[];
  projectFocus: (WeekProjectFocus & { project: Project })[];
};

export type { Task, Day, Week, Habit, HabitCompletion, Project, WeekProjectFocus };

export const AREA_LABELS: Record<string, string> = {
  SERVILIA: 'Servilia',
  GESTIONA: 'Gestiona Proyecta',
  PERSONAL: 'Personal',
};

export const AREA_ORDER = ['SERVILIA', 'GESTIONA', 'PERSONAL'] as const;

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

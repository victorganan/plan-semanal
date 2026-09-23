import type { Task, Day, Week, Habit, HabitCompletion, Project, WeekProjectFocus, Area, ProjectCollaborator } from '@prisma/client';

export type ProjectWithArea = Project & { area: Area };
export type ProjectWithAreaAndCollaborators = ProjectWithArea & { collaborators: ProjectCollaborator[] };
export type TaskWithProject = Task & { project: ProjectWithArea | null; area: Area | null };

export type WeekFull = Week & {
  days: Day[];
  tasks: TaskWithProject[];
  habitCompletions: HabitCompletion[];
  projectFocus: (WeekProjectFocus & { project: ProjectWithArea })[];
};

export type { Task, Day, Week, Habit, HabitCompletion, Project, WeekProjectFocus, Area, ProjectCollaborator };

const AREA_PALETTE = [
  'bg-area-1',
  'bg-area-2',
  'bg-area-3',
  'bg-area-4',
  'bg-area-5',
  'bg-area-6',
  'bg-area-7',
  'bg-area-8',
];
const AREA_TEXT_PALETTE = [
  'text-area-1',
  'text-area-2',
  'text-area-3',
  'text-area-4',
  'text-area-5',
  'text-area-6',
  'text-area-7',
  'text-area-8',
];

export const AREA_PALETTE_SIZE = AREA_PALETTE.length;

export function areaBgClass(colorIndex: number): string {
  return AREA_PALETTE[((colorIndex % AREA_PALETTE.length) + AREA_PALETTE.length) % AREA_PALETTE.length];
}

export function areaTextClass(colorIndex: number): string {
  return AREA_TEXT_PALETTE[((colorIndex % AREA_TEXT_PALETTE.length) + AREA_TEXT_PALETTE.length) % AREA_TEXT_PALETTE.length];
}

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (!minutes) return 'Sin definir';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export const RECURRENCE_LABELS: Record<string, string> = {
  NONE: 'Sin recurrencia',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  FOUR_WEEKLY: 'Cada 4 semanas',
};

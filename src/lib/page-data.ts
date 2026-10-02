import { prisma } from '@/lib/prisma';
import { getOrCreateWeek } from '@/lib/recurring';
import { getTodoistToken } from '@/lib/todoist';
import { hasCalendarAccess } from '@/lib/google-calendar';
import { currentIsoWeek, todayDayOfWeek, dateForDayOfWeek, addWeeks } from '@/lib/week';
import { shouldWarnOverload, averageCompleted } from '@/lib/priority-overload';
import { shouldShowPlanningNudge } from '@/lib/planning-nudge';
import type { WeekFull, TaskWithProject } from '@/types';

const INBOX_INCLUDE = {
  project: { include: { area: true, collaborators: true } },
  area: true,
  subtasks: true,
  recurringTemplate: true,
  tags: true,
} as const;

// Misma definición de "pendiente de procesar" que usa la pestaña Bandeja en
// el cliente (src/components/InboxList.tsx): activa y sin procesar, o
// Algún día cuya fecha de reaparición ya llegó.
export async function getInboxPendingCount(userId: string): Promise<number> {
  return prisma.task.count({
    where: {
      userId,
      kind: 'BACKLOG',
      parentTaskId: null,
      done: false,
      OR: [
        { gtdStatus: 'ACTIVA', processedAt: null },
        { gtdStatus: 'ALGUN_DIA', snoozeUntil: { lte: new Date() } },
      ],
    },
  });
}

export async function getInboxPageData(userId: string) {
  const [inbox, projects, areas, tags, calendarConnected] = await Promise.all([
    prisma.task.findMany({
      where: { userId, kind: 'BACKLOG', parentTaskId: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: INBOX_INCLUDE,
    }) as Promise<TaskWithProject[]>,
    prisma.project.findMany({ where: { userId }, include: { area: true, collaborators: true }, orderBy: { createdAt: 'desc' } }),
    prisma.area.findMany({ where: { userId }, orderBy: { order: 'asc' } }),
    prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    hasCalendarAccess(userId),
  ]);

  return { inbox, projects, areas, tags, calendarConnected };
}

// Aviso de sobrecarga (M1.6e): cuenta las prioritarias de la semana vista y
// las completadas en las 4 semanas anteriores, para comparar en el cliente
// (src/lib/priority-overload.ts, con sus propios tests).
export async function getPriorityOverloadStats(userId: string, isoWeek: string) {
  const recentIsoWeeks = [1, 2, 3, 4].map((n) => addWeeks(isoWeek, -n));
  const weeks = await prisma.week.findMany({
    where: { userId, isoWeek: { in: [isoWeek, ...recentIsoWeeks] } },
    select: {
      isoWeek: true,
      tasks: { where: { isPriority: true }, select: { done: true } },
    },
  });
  const byIso = new Map(weeks.map((w) => [w.isoWeek, w]));
  const currentCount = byIso.get(isoWeek)?.tasks.length ?? 0;
  const recentCompletedCounts = recentIsoWeeks.map((iso) => byIso.get(iso)?.tasks.filter((t) => t.done).length ?? 0);
  return {
    currentCount,
    average: Math.round(averageCompleted(recentCompletedCounts)),
    shouldWarn: shouldWarnOverload(currentCount, recentCompletedCounts),
  };
}

export async function getPlanningNudge(userId: string) {
  const nextIsoWeek = addWeeks(currentIsoWeek(), 1);
  const nextWeek = await prisma.week.findUnique({
    where: { userId_isoWeek: { userId, isoWeek: nextIsoWeek } },
    select: { objective1: true, objective2: true, objective3: true },
  });
  const hasObjectives = !!(nextWeek?.objective1 || nextWeek?.objective2 || nextWeek?.objective3);
  return {
    show: shouldShowPlanningNudge(new Date().getDay(), hasObjectives),
    nextIsoWeek,
  };
}

export async function getWeekPageData(userId: string, isoWeek: string) {
  const weekRef = await getOrCreateWeek(userId, isoWeek);

  const [week, habits, projects, areas, tags, todoistToken, calendarConnected, inbox, user] = await Promise.all([
    prisma.week.findUnique({
      where: { id: weekRef.id },
      include: {
        days: { orderBy: { dayOfWeek: 'asc' } },
        tasks: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            project: { include: { area: true, collaborators: true } },
            area: true,
            subtasks: true,
            recurringTemplate: true,
            tags: true,
          },
        },
        habitCompletions: true,
        projectFocus: { include: { project: { include: { area: true } } } },
      },
    }) as Promise<WeekFull | null>,
    prisma.habit.findMany({ where: { userId, active: true }, orderBy: { order: 'asc' } }),
    prisma.project.findMany({ where: { userId }, include: { area: true, collaborators: true }, orderBy: { createdAt: 'desc' } }),
    prisma.area.findMany({ where: { userId }, orderBy: { order: 'asc' } }),
    prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    getTodoistToken(userId),
    hasCalendarAccess(userId),
    prisma.task.findMany({
      // parentTaskId: null excluye subtareas (también kind=BACKLOG, pero no son bandeja de entrada suelta)
      where: { userId, kind: 'BACKLOG', parentTaskId: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        project: { include: { area: true, collaborators: true } },
        area: true,
        subtasks: true,
        recurringTemplate: true,
        tags: true,
      },
    }) as Promise<TaskWithProject[]>,
    prisma.user.findUnique({
      where: { id: userId },
      select: { dailyCapacityMinutes: true, bufferPercent: true, arranqueVisibility: true, extendedFocusEnabled: true },
    }),
  ]);

  return {
    week: week!,
    habits,
    projects,
    areas,
    tags,
    todoistConnected: !!todoistToken,
    calendarConnected,
    inbox,
    dailyCapacityMinutes: user?.dailyCapacityMinutes ?? 300,
    bufferPercent: user?.bufferPercent ?? 20,
    arranqueVisibility: user?.arranqueVisibility ?? 'LABORABLES',
    extendedFocusEnabled: user?.extendedFocusEnabled ?? false,
  };
}

// Últimos valores distintos, no vacíos, de "pérdidas de tiempo a evitar"
// (Enfoque diario ampliado, Arranque): como Day no guarda fecha propia, se
// resuelve la fecha real de cada uno a partir de su semana+día para poder
// ordenarlos por recencia.
export async function getAvoidTodaySuggestions(userId: string, limit = 10): Promise<string[]> {
  const days = await prisma.day.findMany({
    where: { avoidToday: { not: null }, week: { userId } },
    select: { avoidToday: true, dayOfWeek: true, week: { select: { isoWeek: true } } },
  });

  const dated = days
    .map((d) => ({ value: d.avoidToday!.trim(), date: dateForDayOfWeek(d.week.isoWeek, d.dayOfWeek) }))
    .filter((d) => d.value.length > 0)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const d of dated) {
    if (seen.has(d.value)) continue;
    seen.add(d.value);
    suggestions.push(d.value);
    if (suggestions.length >= limit) break;
  }
  return suggestions;
}

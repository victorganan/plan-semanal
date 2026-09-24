import { prisma } from '@/lib/prisma';
import { getOrCreateWeek } from '@/lib/recurring';
import { getTodoistToken } from '@/lib/todoist';
import { hasCalendarAccess } from '@/lib/google-calendar';
import { currentIsoWeek, todayDayOfWeek } from '@/lib/week';
import type { WeekFull, TaskWithProject } from '@/types';

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
    prisma.user.findUnique({ where: { id: userId }, select: { dailyCapacityMinutes: true } }),
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
  };
}

export async function getTodayPendingTasks(userId: string): Promise<{ id: string; text: string }[]> {
  const week = await getOrCreateWeek(userId, currentIsoWeek());
  const today = await prisma.day.findUnique({
    where: { weekId_dayOfWeek: { weekId: week.id, dayOfWeek: todayDayOfWeek() } },
  });

  return prisma.task.findMany({
    where: {
      userId,
      done: false,
      parentTaskId: null,
      OR: [
        { kind: 'DAY_AREA', dayId: today?.id ?? '__none__' },
        { kind: { in: ['PRIORITY_ACTION', 'CALL'] }, weekId: week.id },
      ],
    },
    select: { id: true, text: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
}

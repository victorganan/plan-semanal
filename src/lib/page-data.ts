import { prisma } from '@/lib/prisma';
import { getOrCreateWeek } from '@/lib/recurring';
import { getTodoistToken } from '@/lib/todoist';
import { hasCalendarAccess } from '@/lib/google-calendar';
import type { WeekFull, TaskWithProject } from '@/types';

export async function getWeekPageData(userId: string, isoWeek: string) {
  const weekRef = await getOrCreateWeek(userId, isoWeek);

  const [week, habits, projects, todoistToken, calendarConnected, inbox] = await Promise.all([
    prisma.week.findUnique({
      where: { id: weekRef.id },
      include: {
        days: { orderBy: { dayOfWeek: 'asc' } },
        tasks: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }], include: { project: true } },
        habitCompletions: true,
        projectFocus: { include: { project: true } },
      },
    }) as Promise<WeekFull | null>,
    prisma.habit.findMany({ where: { userId, active: true }, orderBy: { order: 'asc' } }),
    prisma.project.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    getTodoistToken(userId),
    hasCalendarAccess(userId),
    prisma.task.findMany({
      where: { userId, kind: 'BACKLOG' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { project: true },
    }) as Promise<TaskWithProject[]>,
  ]);

  return {
    week: week!,
    habits,
    projects,
    todoistConnected: !!todoistToken,
    calendarConnected,
    inbox,
  };
}

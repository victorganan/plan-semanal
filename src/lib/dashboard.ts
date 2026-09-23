import { prisma } from '@/lib/prisma';
import { addWeeks, currentIsoWeek, isoWeekOf, mondayBasedDayOfWeek } from '@/lib/week';

async function computeStreak(userId: string, habitIds: string[]): Promise<number> {
  if (habitIds.length === 0) return 0;

  // Recorre los últimos 90 días día a día, pero solo para reunir qué semanas
  // ISO hacen falta: la consulta a la base de datos se hace una única vez,
  // agrupada, en vez de una por día (evita hasta 90 round-trips secuenciales).
  const days: { iso: string; dow: number }[] = [];
  const cursor = new Date();
  for (let i = 0; i < 90; i++) {
    const dow = mondayBasedDayOfWeek(cursor);
    if (dow <= 4) days.push({ iso: isoWeekOf(cursor), dow });
    cursor.setDate(cursor.getDate() - 1);
  }

  const isoWeeks = Array.from(new Set(days.map((d) => d.iso)));
  const weeks = await prisma.week.findMany({
    where: { userId, isoWeek: { in: isoWeeks } },
    include: { habitCompletions: true },
  });
  const weekByIso = new Map(weeks.map((w) => [w.isoWeek, w]));

  let streak = 0;
  for (const { iso, dow } of days) {
    const week = weekByIso.get(iso);
    const allDone = week
      ? habitIds.every((hid) => week.habitCompletions.some((c) => c.habitId === hid && c.dayOfWeek === dow && c.done))
      : false;
    if (!allDone) break;
    streak += 1;
  }
  return streak;
}

export async function computeDashboardStats(userId: string, weeksBack = 8) {
  const current = currentIsoWeek();
  const isoWeeks: string[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) isoWeeks.push(addWeeks(current, -i));

  const [weeks, areas] = await Promise.all([
    prisma.week.findMany({
      where: { userId, isoWeek: { in: isoWeeks } },
      include: { tasks: true, habitCompletions: true },
    }),
    prisma.area.findMany({ where: { userId }, orderBy: { order: 'asc' } }),
  ]);
  const weekByIso = new Map(weeks.map((w) => [w.isoWeek, w]));

  const completionByArea = new Map(areas.map((a) => [a.id, { done: 0, total: 0 }]));

  const trend = isoWeeks.map((iso) => {
    const w = weekByIso.get(iso);
    const dayTasks = w?.tasks.filter((t) => t.kind === 'DAY_AREA') ?? [];
    const total = dayTasks.length;
    const done = dayTasks.filter((t) => t.done).length;
    for (const t of dayTasks) {
      if (!t.areaId) continue;
      const bucket = completionByArea.get(t.areaId);
      if (!bucket) continue;
      bucket.total += 1;
      if (t.done) bucket.done += 1;
    }
    return { isoWeek: iso, total, done, rate: total ? done / total : 0 };
  });

  const habits = await prisma.habit.findMany({ where: { userId, active: true } });
  const habitAdherence = habits.map((h) => {
    let done = 0;
    let total = 0;
    for (const w of weeks) {
      for (const c of w.habitCompletions.filter((hc) => hc.habitId === h.id)) {
        total += 1;
        if (c.done) done += 1;
      }
    }
    return { habitId: h.id, name: h.name, done, total, rate: total ? done / total : 0 };
  });

  const streak = await computeStreak(
    userId,
    habits.map((h) => h.id)
  );

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - weeksBack * 7);
  const allTasks = await prisma.task.findMany({
    where: { userId, createdAt: { gte: sinceDate } },
    select: { id: true, done: true, parentTaskId: true },
  });
  const idsWithSubtasks = new Set(allTasks.filter((t) => t.parentTaskId).map((t) => t.parentTaskId));
  const LEVELS = [
    { key: 'MINIPROJECT', label: 'Miniproyectos', match: (t: (typeof allTasks)[number]) => !t.parentTaskId && idsWithSubtasks.has(t.id) },
    { key: 'SUBTASK', label: 'Subtareas', match: (t: (typeof allTasks)[number]) => !!t.parentTaskId },
    { key: 'TASK', label: 'Tareas sueltas', match: (t: (typeof allTasks)[number]) => !t.parentTaskId && !idsWithSubtasks.has(t.id) },
  ];
  const completionByLevel = LEVELS.map(({ key, label, match }) => {
    const levelTasks = allTasks.filter(match);
    const done = levelTasks.filter((t) => t.done).length;
    return { level: key, label, done, total: levelTasks.length, rate: levelTasks.length ? done / levelTasks.length : 0 };
  });

  return {
    completionByArea: areas.map((a) => {
      const bucket = completionByArea.get(a.id)!;
      return {
        areaId: a.id,
        areaName: a.name,
        areaColorIndex: a.colorIndex,
        done: bucket.done,
        total: bucket.total,
        rate: bucket.total ? bucket.done / bucket.total : 0,
      };
    }),
    trend,
    habitAdherence,
    streak,
    completionByLevel,
  };
}

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getOrCreateWeek } from '@/lib/recurring';
import { currentIsoWeek } from '@/lib/week';

export interface TimeReportTask {
  id: string;
  text: string;
  areaName: string | null;
  areaColorIndex: number | null;
  estimatedMinutes: number;
  executedMinutes: number;
  deviationPct: number; // >0: tardó más de lo estimado. <0: menos.
}

export interface TimeReportByArea {
  areaId: string;
  areaName: string;
  areaColorIndex: number;
  estimatedMinutes: number;
  executedMinutes: number;
}

export interface TimeReportScope {
  totalEstimatedMinutes: number;
  totalExecutedMinutes: number; // solo tareas con estimación (base comparable)
  totalExecutedMinutesAll: number; // todas las tareas con tiempo registrado, con o sin estimación
  estimatedTaskCount: number;
  byArea: TimeReportByArea[];
  mostDeviatedTasks: TimeReportTask[];
}

async function computeScope(where: Prisma.TaskWhereInput): Promise<TimeReportScope> {
  const [estimatedTasks, executedAgg] = await Promise.all([
    prisma.task.findMany({
      where: { ...where, durationMinutes: { not: null } },
      select: {
        id: true,
        text: true,
        durationMinutes: true,
        executedMinutes: true,
        areaId: true,
        area: { select: { name: true, colorIndex: true } },
      },
    }),
    prisma.task.aggregate({ where: { ...where, executedMinutes: { gt: 0 } }, _sum: { executedMinutes: true } }),
  ]);

  const byAreaMap = new Map<string, TimeReportByArea>();
  const tasks: TimeReportTask[] = [];
  let totalEstimatedMinutes = 0;
  let totalExecutedMinutes = 0;

  for (const t of estimatedTasks) {
    const estimated = t.durationMinutes!;
    const executed = t.executedMinutes;
    totalEstimatedMinutes += estimated;
    totalExecutedMinutes += executed;

    tasks.push({
      id: t.id,
      text: t.text,
      areaName: t.area?.name ?? null,
      areaColorIndex: t.area?.colorIndex ?? null,
      estimatedMinutes: estimated,
      executedMinutes: executed,
      deviationPct: ((executed - estimated) / estimated) * 100,
    });

    if (t.areaId && t.area) {
      const bucket = byAreaMap.get(t.areaId) ?? {
        areaId: t.areaId,
        areaName: t.area.name,
        areaColorIndex: t.area.colorIndex,
        estimatedMinutes: 0,
        executedMinutes: 0,
      };
      bucket.estimatedMinutes += estimated;
      bucket.executedMinutes += executed;
      byAreaMap.set(t.areaId, bucket);
    }
  }

  tasks.sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));

  return {
    totalEstimatedMinutes,
    totalExecutedMinutes,
    totalExecutedMinutesAll: executedAgg._sum.executedMinutes ?? 0,
    estimatedTaskCount: tasks.length,
    byArea: Array.from(byAreaMap.values()).sort((a, b) => b.estimatedMinutes - a.estimatedMinutes),
    mostDeviatedTasks: tasks.slice(0, 15),
  };
}

export async function getTimeReport(userId: string) {
  const week = await getOrCreateWeek(userId, currentIsoWeek());

  const [weekScope, allScope] = await Promise.all([
    computeScope({ userId, weekId: week.id }),
    computeScope({ userId }),
  ]);

  return { week: weekScope, all: allScope };
}

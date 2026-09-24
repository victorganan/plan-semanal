import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { resortByScheduledTime } from '@/lib/task-order';

// Utilidad puntual: reordena por hora de ejecución todas las tareas de día
// ya existentes del usuario autenticado, agrupadas por día+área. Solo toca
// los datos del propio usuario (requireUserId). Segura de ejecutar más de
// una vez.
export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const tasks = await prisma.task.findMany({
    where: { userId, kind: 'DAY_AREA', dayId: { not: null }, areaId: { not: null } },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, dayId: true, areaId: true, scheduledAt: true, order: true },
  });

  const buckets = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const key = `${t.dayId}::${t.areaId}`;
    const arr = buckets.get(key);
    if (arr) arr.push(t);
    else buckets.set(key, [t]);
  }

  let tasksUpdated = 0;
  for (const bucket of buckets.values()) {
    const resorted = resortByScheduledTime(bucket);
    await prisma.$transaction(resorted.map((t, i) => prisma.task.update({ where: { id: t.id }, data: { order: i } })));
    tasksUpdated += resorted.length;
  }

  return NextResponse.json({ ok: true, groups: buckets.size, tasksUpdated });
}

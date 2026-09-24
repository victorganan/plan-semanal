import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  const sessions = await prisma.focusSession.findMany({
    where: {
      userId,
      ...(from || to
        ? {
            startedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lt: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: { task: { select: { id: true, text: true } } },
    orderBy: { startedAt: 'desc' },
  });

  return NextResponse.json({
    count: sessions.length,
    totalMinutes: sessions.reduce((sum, s) => sum + s.minutes, 0),
    sessions,
  });
}

const createSchema = z.object({
  taskId: z.string().nullable().optional(),
  minutes: z.number().int().min(1).max(180),
  startedAt: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = createSchema.parse(await req.json());

  if (body.taskId) {
    const task = await prisma.task.findUnique({ where: { id: body.taskId } });
    if (!task || task.userId !== userId) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }
  }

  const session = await prisma.focusSession.create({
    data: {
      userId,
      taskId: body.taskId ?? undefined,
      minutes: body.minutes,
      startedAt: new Date(body.startedAt),
    },
    include: { task: { select: { id: true, text: true } } },
  });

  return NextResponse.json(session, { status: 201 });
}

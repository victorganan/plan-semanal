import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getOrCreateWeek } from '@/lib/recurring';
import { getTodoistToken, listTodoistTasks, todoistPriorityToOurs } from '@/lib/todoist';

const schema = z.object({
  todoistTaskId: z.string(),
  isoWeek: z.string().regex(/^\d{4}-W\d{2}$/),
  kind: z.enum(['DAY_AREA', 'PRIORITY_ACTION', 'CALL']),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  area: z.enum(['SERVILIA', 'GESTIONA', 'PERSONAL']).optional(),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const token = await getTodoistToken(userId);
  if (!token) return NextResponse.json({ error: 'Todoist no conectado' }, { status: 400 });

  const body = schema.parse(await req.json());
  const todoistTasks = await listTodoistTasks(token);
  const source = todoistTasks.find((t) => t.id === body.todoistTaskId);
  if (!source) return NextResponse.json({ error: 'Tarea de Todoist no encontrada' }, { status: 404 });

  const week = await getOrCreateWeek(userId, body.isoWeek);
  let dayId: string | undefined;
  if (body.kind === 'DAY_AREA' && body.dayOfWeek !== undefined) {
    const day = await prisma.day.findUnique({
      where: { weekId_dayOfWeek: { weekId: week.id, dayOfWeek: body.dayOfWeek } },
    });
    dayId = day?.id;
  }

  const task = await prisma.task.create({
    data: {
      weekId: week.id,
      dayId,
      kind: body.kind,
      area: body.kind === 'DAY_AREA' ? body.area : undefined,
      text: source.content,
      priority: todoistPriorityToOurs(source.priority),
      scheduledAt: source.due?.datetime ? new Date(source.due.datetime) : undefined,
    },
  });

  await logActivity(prisma, {
    userId,
    entityType: 'Task',
    entityId: task.id,
    action: 'CREATED',
    summary: `Tarea importada desde Todoist: "${task.text}"`,
    metadata: { todoistTaskId: source.id },
  });

  return NextResponse.json(task, { status: 201 });
}

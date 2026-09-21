import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getTodoistToken, createTodoistTask, ourPriorityToTodoist } from '@/lib/todoist';

const schema = z.object({ taskId: z.string() });

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const token = await getTodoistToken(userId);
  if (!token) return NextResponse.json({ error: 'Todoist no conectado' }, { status: 400 });

  const { taskId } = schema.parse(await req.json());
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== userId) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  const created = await createTodoistTask(token, {
    content: task.text,
    dueDate: task.scheduledAt ? task.scheduledAt.toISOString().slice(0, 10) : undefined,
    priority: ourPriorityToTodoist(task.priority),
  });

  await logActivity(prisma, {
    userId,
    entityType: 'Task',
    entityId: task.id,
    action: 'UPDATED',
    summary: `Tarea exportada a Todoist: "${task.text}"`,
    metadata: { todoistTaskId: created.id },
  });

  return NextResponse.json({ ok: true, todoistTask: created });
}

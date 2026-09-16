import { NextResponse } from 'next/server';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getTodoistToken, listTodoistTasks } from '@/lib/todoist';

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const token = await getTodoistToken(userId);
  if (!token) return NextResponse.json({ error: 'Todoist no conectado' }, { status: 400 });

  const tasks = await listTodoistTasks(token);
  return NextResponse.json(tasks);
}

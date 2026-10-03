import { NextResponse } from 'next/server';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getTaskListTasks } from '@/lib/page-data';

// Recarga de la página Tareas tras una acción en lote.
export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  return NextResponse.json(await getTaskListTasks(userId));
}

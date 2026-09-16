import { NextResponse } from 'next/server';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getTodoistToken, disconnectTodoist } from '@/lib/todoist';

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const token = await getTodoistToken(userId);
  return NextResponse.json({ connected: !!token });
}

export async function DELETE() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  await disconnectTodoist(userId);
  return NextResponse.json({ ok: true });
}

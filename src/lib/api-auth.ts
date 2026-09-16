import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function requireUserId(): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  return session.user.id;
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

import { NextResponse } from 'next/server';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { hasCalendarAccess } from '@/lib/google-calendar';

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const connected = await hasCalendarAccess(userId);
  return NextResponse.json({ connected });
}

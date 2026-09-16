import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { computeDashboardStats } from '@/lib/dashboard';

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const weeksParam = req.nextUrl.searchParams.get('weeks');
  const weeksBack = weeksParam ? Math.min(Math.max(Number(weeksParam), 1), 26) : 8;

  const stats = await computeDashboardStats(userId, weeksBack);
  return NextResponse.json(stats);
}

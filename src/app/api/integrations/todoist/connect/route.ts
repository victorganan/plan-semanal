import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { getTodoistAuthUrl } from '@/lib/todoist';

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const state = randomBytes(16).toString('hex');
  const redirectUri = new URL('/api/integrations/todoist/callback', req.nextUrl.origin).toString();
  const authUrl = getTodoistAuthUrl(state, redirectUri);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set('todoist_oauth_state', state, { httpOnly: true, maxAge: 600, sameSite: 'lax', path: '/' });
  return res;
}

import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { exchangeTodoistCode, saveTodoistToken } from '@/lib/todoist';

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const cookieState = req.cookies.get('todoist_oauth_state')?.value;

  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(new URL('/ajustes?todoist=error', req.nextUrl.origin));
  }

  const redirectUri = new URL('/api/integrations/todoist/callback', req.nextUrl.origin).toString();

  try {
    const accessToken = await exchangeTodoistCode(code, redirectUri);
    await saveTodoistToken(userId, accessToken);
  } catch {
    return NextResponse.redirect(new URL('/ajustes?todoist=error', req.nextUrl.origin));
  }

  const res = NextResponse.redirect(new URL('/ajustes?todoist=connected', req.nextUrl.origin));
  res.cookies.delete('todoist_oauth_state');
  return res;
}

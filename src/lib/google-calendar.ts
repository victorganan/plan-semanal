import { prisma } from '@/lib/prisma';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

/**
 * Devuelve un access token válido de Google Calendar para el usuario,
 * refrescándolo si ha caducado. Usa la cuenta Google enlazada por Auth.js
 * (misma cuenta del login), que ya guarda refresh_token porque el provider
 * pide el scope de Calendar en el login.
 */
export async function getValidGoogleAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
  });
  if (!account) return null;

  const isExpired = !account.expires_at || account.expires_at * 1000 < Date.now() + 60_000;
  if (!isExpired && account.access_token) return account.access_token;

  if (!account.refresh_token) return null;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
    }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { access_token: string; expires_in: number };

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    },
  });

  return data.access_token;
}

export async function hasCalendarAccess(userId: string): Promise<boolean> {
  const account = await prisma.account.findFirst({ where: { userId, provider: 'google' } });
  return !!account?.refresh_token && !!account.scope?.includes('calendar');
}

export async function createCalendarEvent(
  accessToken: string,
  params: { summary: string; description?: string; startISO: string; durationMinutes: number }
) {
  const start = new Date(params.startISO);
  const end = new Date(start.getTime() + params.durationMinutes * 60_000);

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: params.summary,
      description: params.description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }),
  });
  if (!res.ok) throw new Error(`Error creando evento en Google Calendar: ${res.status}`);
  return res.json();
}

export function durationEnumToMinutes(duration: string | null): number {
  switch (duration) {
    case 'LT_HALF':
      return 30;
    case 'HALF_TO_ONE':
      return 60;
    case 'ONE_TO_TWO':
      return 120;
    case 'GT_TWO':
      return 180;
    default:
      return 30;
  }
}

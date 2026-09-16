import { prisma } from '@/lib/prisma';

const TODOIST_AUTHORIZE_URL = 'https://todoist.com/oauth/authorize';
const TODOIST_TOKEN_URL = 'https://todoist.com/oauth/access_token';
const TODOIST_API_BASE = 'https://api.todoist.com/rest/v2';

export function getTodoistAuthUrl(state: string, redirectUri: string) {
  const url = new URL(TODOIST_AUTHORIZE_URL);
  url.searchParams.set('client_id', process.env.TODOIST_CLIENT_ID ?? '');
  url.searchParams.set('scope', 'data:read_write');
  url.searchParams.set('state', state);
  url.searchParams.set('redirect_uri', redirectUri);
  return url.toString();
}

export async function exchangeTodoistCode(code: string, redirectUri: string) {
  const res = await fetch(TODOIST_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TODOIST_CLIENT_ID ?? '',
      client_secret: process.env.TODOIST_CLIENT_SECRET ?? '',
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Error intercambiando código de Todoist: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function getTodoistToken(userId: string): Promise<string | null> {
  const row = await prisma.integrationToken.findUnique({
    where: { userId_provider: { userId, provider: 'TODOIST' } },
  });
  return row?.accessToken ?? null;
}

export async function saveTodoistToken(userId: string, accessToken: string) {
  await prisma.integrationToken.upsert({
    where: { userId_provider: { userId, provider: 'TODOIST' } },
    create: { userId, provider: 'TODOIST', accessToken },
    update: { accessToken },
  });
}

export async function disconnectTodoist(userId: string) {
  await prisma.integrationToken.deleteMany({ where: { userId, provider: 'TODOIST' } });
}

export interface TodoistTask {
  id: string;
  content: string;
  priority: number;
  due: { date: string; datetime?: string } | null;
}

export async function listTodoistTasks(accessToken: string): Promise<TodoistTask[]> {
  const res = await fetch(`${TODOIST_API_BASE}/tasks`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Error listando tareas de Todoist: ${res.status}`);
  return res.json();
}

export async function createTodoistTask(
  accessToken: string,
  params: { content: string; dueDate?: string; priority?: number }
) {
  const res = await fetch(`${TODOIST_API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: params.content,
      due_date: params.dueDate,
      priority: params.priority,
    }),
  });
  if (!res.ok) throw new Error(`Error creando tarea en Todoist: ${res.status}`);
  return res.json();
}

// Mapea prioridad Todoist (1=normal..4=urgente) a nuestra escala.
export function todoistPriorityToOurs(p: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (p >= 4) return 'HIGH';
  if (p === 3) return 'MEDIUM';
  return 'LOW';
}

export function ourPriorityToTodoist(p: 'LOW' | 'MEDIUM' | 'HIGH'): number {
  if (p === 'HIGH') return 4;
  if (p === 'MEDIUM') return 3;
  return 1;
}

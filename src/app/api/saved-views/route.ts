import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { listViewConfigSchema } from '@/lib/task-list';

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const views = await prisma.savedView.findMany({ where: { userId }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  return NextResponse.json(views);
}

const createSchema = z.object({ name: z.string().trim().min(1).max(60), config: listViewConfigSchema });

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Revisa el nombre (máx. 60 caracteres) y los filtros de la vista' }, { status: 400 });

  const last = await prisma.savedView.findFirst({ where: { userId }, orderBy: { order: 'desc' } });
  const view = await prisma.savedView
    .create({ data: { userId, name: parsed.data.name, config: parsed.data.config, order: (last?.order ?? -1) + 1 } })
    .catch(() => null);
  if (!view) return NextResponse.json({ error: 'Ya tienes una vista con ese nombre' }, { status: 409 });
  return NextResponse.json(view, { status: 201 });
}

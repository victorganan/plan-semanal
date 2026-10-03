import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { listViewConfigSchema } from '@/lib/task-list';

const patchSchema = z.object({ name: z.string().trim().min(1).max(60).optional(), config: listViewConfigSchema.optional() });

async function loadOwned(userId: string, id: string) {
  const view = await prisma.savedView.findUnique({ where: { id } });
  return view && view.userId === userId ? view : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id } = await params;
  if (!(await loadOwned(userId, id))) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Datos de la vista no válidos' }, { status: 400 });
  const updated = await prisma.savedView.update({ where: { id }, data: parsed.data }).catch(() => null);
  if (!updated) return NextResponse.json({ error: 'Ya tienes una vista con ese nombre' }, { status: 409 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id } = await params;
  if (!(await loadOwned(userId, id))) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  await prisma.savedView.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

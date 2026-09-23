import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const areas = await prisma.area.findMany({ where: { userId }, orderBy: { order: 'asc' } });
  return NextResponse.json(areas);
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = createSchema.parse(await req.json());

  const existing = await prisma.area.findFirst({ where: { userId }, orderBy: { order: 'desc' } });
  const order = (existing?.order ?? -1) + 1;

  const area = await prisma.area
    .create({ data: { userId, name: body.name, description: body.description ?? null, order } })
    .catch(() => null);

  if (!area) {
    return NextResponse.json({ error: 'Ya tienes un área con ese nombre' }, { status: 409 });
  }

  await logActivity(prisma, {
    userId,
    entityType: 'Area',
    entityId: area.id,
    action: 'CREATED',
    summary: `Área creada: "${area.name}"`,
  });

  return NextResponse.json(area, { status: 201 });
}

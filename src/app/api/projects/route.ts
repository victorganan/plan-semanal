import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const status = req.nextUrl.searchParams.get('status');
  const projects = await prisma.project.findMany({
    where: { userId, ...(status ? { status: status as 'ACTIVE' | 'ARCHIVED' } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(projects);
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  area: z.enum(['SERVILIA', 'GESTIONA', 'PERSONAL']),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = createSchema.parse(await req.json());
  const project = await prisma.project.create({ data: { userId, ...body } });

  await logActivity(prisma, {
    userId,
    entityType: 'Project',
    entityId: project.id,
    action: 'CREATED',
    summary: `Proyecto creado: "${project.name}"`,
  });

  return NextResponse.json(project, { status: 201 });
}

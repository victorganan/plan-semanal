import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';

const SORT_OPTIONS = {
  createdAt_desc: { createdAt: 'desc' as const },
  createdAt_asc: { createdAt: 'asc' as const },
  dueDate_asc: { dueDate: 'asc' as const },
};

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const status = req.nextUrl.searchParams.get('status');
  const areaId = req.nextUrl.searchParams.get('areaId');
  const sortParam = req.nextUrl.searchParams.get('sort');
  const orderBy = SORT_OPTIONS[sortParam as keyof typeof SORT_OPTIONS] ?? SORT_OPTIONS.createdAt_desc;

  const projects = await prisma.project.findMany({
    where: {
      userId,
      ...(status ? { status: status as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' } : {}),
      ...(areaId ? { areaId } : {}),
    },
    include: { area: true, collaborators: true },
    orderBy,
  });
  return NextResponse.json(projects);
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  areaId: z.string(),
  dueDate: z.string().datetime().nullable().optional(),
  collaboratorNames: z.array(z.string().min(1).max(100)).max(30).optional(),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = createSchema.parse(await req.json());
  const { collaboratorNames, dueDate, ...rest } = body;

  const project = await prisma.project.create({
    data: {
      userId,
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      collaborators: collaboratorNames?.length
        ? { create: Array.from(new Set(collaboratorNames)).map((name) => ({ name })) }
        : undefined,
    },
    include: { area: true, collaborators: true },
  });

  await logActivity(prisma, {
    userId,
    entityType: 'Project',
    entityId: project.id,
    action: 'CREATED',
    summary: `Proyecto creado: "${project.name}"`,
  });

  return NextResponse.json(project, { status: 201 });
}

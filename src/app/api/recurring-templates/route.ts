import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { requireUserId, isResponse } from '@/lib/api-auth';
import { currentIsoWeek } from '@/lib/week';

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const templates = await prisma.recurringTaskTemplate.findMany({
    where: { userId, active: true },
    include: { area: true },
    orderBy: [{ dayOfWeek: 'asc' }],
  });
  return NextResponse.json(templates);
}

const createSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  areaId: z.string(),
  text: z.string().min(1).max(500),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  duration: z.enum(['LT_HALF', 'HALF_TO_ONE', 'ONE_TO_TWO', 'GT_TWO']).nullable().optional(),
  recurrence: z.enum(['WEEKLY', 'BIWEEKLY', 'FOUR_WEEKLY']),
  startIsoWeek: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = createSchema.parse(await req.json());

  const template = await prisma.recurringTaskTemplate.create({
    data: { userId, ...body, startIsoWeek: body.startIsoWeek ?? currentIsoWeek() },
  });

  await logActivity(prisma, {
    userId,
    entityType: 'RecurringTaskTemplate',
    entityId: template.id,
    action: 'CREATED',
    summary: `Plantilla recurrente creada: "${template.text}"`,
  });

  return NextResponse.json(template, { status: 201 });
}

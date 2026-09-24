import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';

// Endpoint puntual del módulo 1.2 (campos GTD de Task). Solo toca las tareas
// del usuario autenticado, y solo filas con processedAt = NULL (idempotente:
// repetirlo no vuelve a tocar lo ya migrado). Sin ?apply=true es una
// simulación de solo lectura: enseña los recuentos sin escribir nada.
// Se retira en cuanto el Product Owner confirme el resultado en producción.
//
// Los tres primeros grupos son exactamente lo que se ve hoy en la Bandeja
// (BACKLOG de nivel superior): quedan sin procesar, pasan a Algún día, o ya
// cuentan como procesadas por tener subtareas. El cuarto grupo es todo lo
// demás (tareas de día/prioridad/llamada y subtareas): no aparecen en la
// Bandeja, pero también reciben processedAt = createdAt para que el módulo
// 1.3 (que usará processedAt como marca general de "ya procesada") no las
// trate como pendientes de triaje.

const INBOX_STAYS_WHERE = `
    t."kind" = 'BACKLOG'
    AND t."parentTaskId" IS NULL
    AND t."processedAt" IS NULL
    AND (t."quadrant" IS NULL OR t."quadrant" != 'ALGUN_DIA')
    AND NOT EXISTS (SELECT 1 FROM "Task" s WHERE s."parentTaskId" = t.id)
`;

const INBOX_TO_ALGUN_DIA_WHERE = `
    t."kind" = 'BACKLOG'
    AND t."parentTaskId" IS NULL
    AND t."quadrant" = 'ALGUN_DIA'
    AND t."processedAt" IS NULL
    AND NOT EXISTS (SELECT 1 FROM "Task" s WHERE s."parentTaskId" = t.id)
`;

const INBOX_TO_PROCESADA_WHERE = `
    t."kind" = 'BACKLOG'
    AND t."parentTaskId" IS NULL
    AND t."processedAt" IS NULL
    AND EXISTS (SELECT 1 FROM "Task" s WHERE s."parentTaskId" = t.id)
`;

// Todo lo que no es BACKLOG de nivel superior: tareas de día/prioridad/
// llamada, y subtareas (de cualquier kind). Nunca aparecen en la Bandeja,
// así que no importa si ya tenían quadrant o no.
const OTHER_TASKS_WHERE = `
    t."processedAt" IS NULL
    AND NOT (t."kind" = 'BACKLOG' AND t."parentTaskId" IS NULL)
`;

async function countFor(userId: string, where: string) {
  const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
    `SELECT COUNT(*)::int AS count FROM "Task" t WHERE t."userId" = $1 AND ${where}`,
    userId
  );
  return rows[0].count;
}

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const apply = req.nextUrl.searchParams.get('apply') === 'true';

  if (!apply) {
    const [inboxStays, inboxToAlgunDia, inboxToProcesada, otherTasksToProcesada, totalTasks] = await Promise.all([
      countFor(userId, INBOX_STAYS_WHERE),
      countFor(userId, INBOX_TO_ALGUN_DIA_WHERE),
      countFor(userId, INBOX_TO_PROCESADA_WHERE),
      countFor(userId, OTHER_TASKS_WHERE),
      prisma.task.count({ where: { userId } }),
    ]);
    return NextResponse.json({
      dryRun: true,
      inboxStays,
      inboxToAlgunDia,
      inboxToProcesada,
      otherTasksToProcesada,
      totalTasks,
      hint: 'Repite la llamada con ?apply=true para aplicar de verdad.',
    });
  }

  const [algunDiaCount, inboxProcesadaCount, otherProcesadaCount] = await Promise.all([
    prisma.$executeRawUnsafe(
      `UPDATE "Task" t SET "gtdStatus" = 'ALGUN_DIA', "processedAt" = t."updatedAt" WHERE t."userId" = $1 AND ${INBOX_TO_ALGUN_DIA_WHERE}`,
      userId
    ),
    prisma.$executeRawUnsafe(
      `UPDATE "Task" t SET "processedAt" = t."createdAt" WHERE t."userId" = $1 AND ${INBOX_TO_PROCESADA_WHERE}`,
      userId
    ),
    prisma.$executeRawUnsafe(
      `UPDATE "Task" t SET "processedAt" = t."createdAt" WHERE t."userId" = $1 AND ${OTHER_TASKS_WHERE}`,
      userId
    ),
  ]);

  const inboxStays = await countFor(userId, INBOX_STAYS_WHERE);

  return NextResponse.json({
    ok: true,
    markedAlgunDia: algunDiaCount,
    markedInboxProcesada: inboxProcesadaCount,
    markedOtherProcesada: otherProcesadaCount,
    inboxStays,
  });
}

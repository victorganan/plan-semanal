import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, isResponse } from '@/lib/api-auth';

// Endpoint puntual del módulo 1.2 (campos GTD de Task). Solo toca las tareas
// del usuario autenticado, y solo filas con processedAt = NULL (idempotente:
// repetirlo no vuelve a tocar lo ya migrado). Sin ?apply=true es una
// simulación de solo lectura: enseña los recuentos sin escribir nada.
// Se retira en cuanto el Product Owner confirme el resultado en producción.

const DEFERRED_WHERE = `
    t."kind" = 'BACKLOG'
    AND t."parentTaskId" IS NULL
    AND t."quadrant" = 'ALGUN_DIA'
    AND t."processedAt" IS NULL
    AND NOT EXISTS (SELECT 1 FROM "Task" s WHERE s."parentTaskId" = t.id)
`;

// Solo tareas de la Bandeja (BACKLOG de nivel superior) que ya tienen
// subtareas: un miniproyecto ya organizado, no algo pendiente de decidir.
// El resto de tipos de tarea (día, prioridad, llamada) y las subtareas en
// sí no se tocan: processedAt solo tiene sentido para distinguir qué sigue
// sin procesar en la Bandeja, no se usa en ningún otro sitio de la app.
const PROCESSED_WHERE = `
    t."kind" = 'BACKLOG'
    AND t."parentTaskId" IS NULL
    AND t."processedAt" IS NULL
    AND EXISTS (SELECT 1 FROM "Task" s WHERE s."parentTaskId" = t.id)
`;

const STILL_INBOX_WHERE = `
    t."kind" = 'BACKLOG'
    AND t."parentTaskId" IS NULL
    AND t."processedAt" IS NULL
    AND (t."quadrant" IS NULL OR t."quadrant" != 'ALGUN_DIA')
    AND NOT EXISTS (SELECT 1 FROM "Task" s WHERE s."parentTaskId" = t.id)
`;

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const apply = req.nextUrl.searchParams.get('apply') === 'true';

  if (!apply) {
    const [deferred, processed, stillInbox] = await Promise.all([
      prisma.$queryRawUnsafe<{ count: number }[]>(
        `SELECT COUNT(*)::int AS count FROM "Task" t WHERE t."userId" = $1 AND ${DEFERRED_WHERE}`,
        userId
      ),
      prisma.$queryRawUnsafe<{ count: number }[]>(
        `SELECT COUNT(*)::int AS count FROM "Task" t WHERE t."userId" = $1 AND ${PROCESSED_WHERE}`,
        userId
      ),
      prisma.$queryRawUnsafe<{ count: number }[]>(
        `SELECT COUNT(*)::int AS count FROM "Task" t WHERE t."userId" = $1 AND ${STILL_INBOX_WHERE}`,
        userId
      ),
    ]);
    return NextResponse.json({
      dryRun: true,
      wouldMarkAlgunDia: deferred[0].count,
      wouldMarkProcesada: processed[0].count,
      staysInInbox: stillInbox[0].count,
      hint: 'Repite la llamada con ?apply=true para aplicar de verdad.',
    });
  }

  const [deferredCount, processedCount] = await Promise.all([
    prisma.$executeRawUnsafe(
      `UPDATE "Task" t SET "gtdStatus" = 'ALGUN_DIA', "processedAt" = t."updatedAt" WHERE t."userId" = $1 AND ${DEFERRED_WHERE}`,
      userId
    ),
    prisma.$executeRawUnsafe(
      `UPDATE "Task" t SET "processedAt" = t."createdAt" WHERE t."userId" = $1 AND ${PROCESSED_WHERE}`,
      userId
    ),
  ]);

  const stillInbox = await prisma.$queryRawUnsafe<{ count: number }[]>(
    `SELECT COUNT(*)::int AS count FROM "Task" t WHERE t."userId" = $1 AND ${STILL_INBOX_WHERE}`,
    userId
  );

  return NextResponse.json({
    ok: true,
    markedAlgunDia: deferredCount,
    markedProcesada: processedCount,
    staysInInbox: stillInbox[0].count,
  });
}

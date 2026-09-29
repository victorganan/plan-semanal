-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "calendarEventId" TEXT;

-- Unifica "Acción prioritaria": las PRIORITY_ACTION existentes ya vivían en
-- la sección de prioritarias por definición, así que se marcan isPriority
-- para seguir apareciendo ahí cuando la sección pase a filtrar por
-- isPriority en vez de por kind. No se toca weekId/dayId/kind: cero riesgo
-- de que una tarea acabe en el día o área equivocados.
UPDATE "Task" SET "isPriority" = true WHERE "kind" = 'PRIORITY_ACTION' AND "isPriority" = false;

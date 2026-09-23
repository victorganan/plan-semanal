-- Convierte el enum fijo "Area" en un modelo editable por usuario, sin
-- perder los datos existentes: libera el nombre "Area" del enum antiguo,
-- crea la tabla nueva, siembra las 3 áreas de siempre para cada usuario
-- existente, y traslada cada fila a su área correspondiente antes de
-- borrar las columnas enum.

-- 1. Libera el nombre "Area" (lo ocupaba el enum) para la tabla nueva
ALTER TYPE "Area" RENAME TO "AreaEnum_old";

-- 2. Tabla Area
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Area_userId_idx" ON "Area"("userId");
CREATE UNIQUE INDEX "Area_userId_name_key" ON "Area"("userId", "name");

ALTER TABLE "Area" ADD CONSTRAINT "Area_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Siembra las 3 áreas de siempre para cada usuario existente
INSERT INTO "Area" ("id", "userId", "name", "description", "order", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'Servilia', NULL, 0, now(), now() FROM "User"
UNION ALL
SELECT gen_random_uuid()::text, "id", 'Gestiona Proyecta', NULL, 1, now(), now() FROM "User"
UNION ALL
SELECT gen_random_uuid()::text, "id", 'Personal', NULL, 2, now(), now() FROM "User";

-- 4. Task.area -> Task.areaId (opcional, solo tareas DAY_AREA lo tenían)
ALTER TABLE "Task" ADD COLUMN "areaId" TEXT;

UPDATE "Task" t SET "areaId" = a."id"
FROM "Area" a
WHERE a."userId" = t."userId"
  AND a."name" = CASE t."area"
      WHEN 'SERVILIA' THEN 'Servilia'
      WHEN 'GESTIONA' THEN 'Gestiona Proyecta'
      WHEN 'PERSONAL' THEN 'Personal'
    END
  AND t."area" IS NOT NULL;

ALTER TABLE "Task" DROP COLUMN "area";
CREATE INDEX "Task_areaId_idx" ON "Task"("areaId");
ALTER TABLE "Task" ADD CONSTRAINT "Task_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Project.area -> Project.areaId (obligatorio)
ALTER TABLE "Project" ADD COLUMN "areaId" TEXT;

UPDATE "Project" p SET "areaId" = a."id"
FROM "Area" a
WHERE a."userId" = p."userId"
  AND a."name" = CASE p."area"
      WHEN 'SERVILIA' THEN 'Servilia'
      WHEN 'GESTIONA' THEN 'Gestiona Proyecta'
      WHEN 'PERSONAL' THEN 'Personal'
    END;

ALTER TABLE "Project" ALTER COLUMN "areaId" SET NOT NULL;
ALTER TABLE "Project" DROP COLUMN "area";
CREATE INDEX "Project_areaId_idx" ON "Project"("areaId");
ALTER TABLE "Project" ADD CONSTRAINT "Project_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. RecurringTaskTemplate.area -> RecurringTaskTemplate.areaId (obligatorio)
ALTER TABLE "RecurringTaskTemplate" ADD COLUMN "areaId" TEXT;

UPDATE "RecurringTaskTemplate" r SET "areaId" = a."id"
FROM "Area" a
WHERE a."userId" = r."userId"
  AND a."name" = CASE r."area"
      WHEN 'SERVILIA' THEN 'Servilia'
      WHEN 'GESTIONA' THEN 'Gestiona Proyecta'
      WHEN 'PERSONAL' THEN 'Personal'
    END;

ALTER TABLE "RecurringTaskTemplate" ALTER COLUMN "areaId" SET NOT NULL;
ALTER TABLE "RecurringTaskTemplate" DROP COLUMN "area";
CREATE INDEX "RecurringTaskTemplate_areaId_idx" ON "RecurringTaskTemplate"("areaId");
ALTER TABLE "RecurringTaskTemplate" ADD CONSTRAINT "RecurringTaskTemplate_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. El enum ya no lo usa ninguna columna
DROP TYPE "AreaEnum_old";

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AreaToPerson" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Person_userId_idx" ON "Person"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_userId_name_key" ON "Person"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "_AreaToPerson_AB_unique" ON "_AreaToPerson"("A", "B");

-- CreateIndex
CREATE INDEX "_AreaToPerson_B_index" ON "_AreaToPerson"("B");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AreaToPerson" ADD CONSTRAINT "_AreaToPerson_A_fkey" FOREIGN KEY ("A") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AreaToPerson" ADD CONSTRAINT "_AreaToPerson_B_fkey" FOREIGN KEY ("B") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Migración de datos: nombres ya usados en tareas delegadas/en espera y en
-- colaboradores de proyecto pasan a la lista de Personas, sin duplicados
-- (se ignoran mayúsculas y espacios sobrantes; gana la primera forma usada).
INSERT INTO "Person" ("id", "userId", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "userId", "name", NOW(), NOW()
FROM (
  SELECT DISTINCT ON ("userId", lower("name")) "userId", "name"
  FROM (
    SELECT "userId", btrim("assignedTo") AS "name", "createdAt" FROM "Task" WHERE btrim(coalesce("assignedTo", '')) <> ''
    UNION ALL
    SELECT "userId", btrim("waitingOn"), "createdAt" FROM "Task" WHERE btrim(coalesce("waitingOn", '')) <> ''
    UNION ALL
    SELECT p."userId", btrim(c."name"), c."createdAt" FROM "ProjectCollaborator" c JOIN "Project" p ON p."id" = c."projectId" WHERE btrim(c."name") <> ''
  ) AS used
  ORDER BY "userId", lower("name"), "createdAt"
) AS unique_names;

-- Las tareas que usaban otra variante del mismo nombre ("ana" / "Ana ")
-- pasan a la forma guardada, para que agrupen igual en "Delegadas y en espera".
UPDATE "Task" t SET "assignedTo" = p."name"
FROM "Person" p
WHERE p."userId" = t."userId" AND lower(btrim(t."assignedTo")) = lower(p."name") AND t."assignedTo" <> p."name";

UPDATE "Task" t SET "waitingOn" = p."name"
FROM "Person" p
WHERE p."userId" = t."userId" AND lower(btrim(t."waitingOn")) = lower(p."name") AND t."waitingOn" <> p."name";

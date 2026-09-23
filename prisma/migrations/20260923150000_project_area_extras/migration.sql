-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "Area" ADD COLUMN     "colorIndex" INTEGER NOT NULL DEFAULT 0;

-- Reparte colores distintos entre las áreas ya existentes (en vez de que
-- todas empiecen en el mismo color por defecto).
UPDATE "Area" SET "colorIndex" = "order" % 8;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "dueDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectCollaborator" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCollaborator_projectId_name_key" ON "ProjectCollaborator"("projectId", "name");

-- AddForeignKey
ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

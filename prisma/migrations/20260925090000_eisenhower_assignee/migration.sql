-- Matriz de Eisenhower interactiva + campo "Asignado a" en tareas.
-- Ambas columnas son opcionales y aditivas: no requiere transformar datos existentes.

CREATE TYPE "EisenhowerQuadrant" AS ENUM ('HACER', 'DECIDIR', 'DELEGAR', 'ALGUN_DIA');

ALTER TABLE "Task" ADD COLUMN "quadrant" "EisenhowerQuadrant";
ALTER TABLE "Task" ADD COLUMN "assignedTo" TEXT;

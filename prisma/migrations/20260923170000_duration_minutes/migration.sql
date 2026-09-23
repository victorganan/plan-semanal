-- Sustituye la duración por rangos fijos (Duration) por una duración
-- estimada real en minutos. Traslada los valores existentes a un minutaje
-- representativo (siempre múltiplo de 15, compatible con el nuevo selector
-- de horas y minutos) antes de borrar las columnas y el tipo antiguos.

-- Task
ALTER TABLE "Task" ADD COLUMN "durationMinutes" INTEGER;

UPDATE "Task" SET "durationMinutes" = CASE "duration"
    WHEN 'LT_HALF' THEN 15
    WHEN 'HALF_TO_ONE' THEN 45
    WHEN 'ONE_TO_TWO' THEN 90
    WHEN 'GT_TWO' THEN 150
  END
WHERE "duration" IS NOT NULL;

ALTER TABLE "Task" DROP COLUMN "duration";

-- RecurringTaskTemplate
ALTER TABLE "RecurringTaskTemplate" ADD COLUMN "durationMinutes" INTEGER;

UPDATE "RecurringTaskTemplate" SET "durationMinutes" = CASE "duration"
    WHEN 'LT_HALF' THEN 15
    WHEN 'HALF_TO_ONE' THEN 45
    WHEN 'ONE_TO_TWO' THEN 90
    WHEN 'GT_TWO' THEN 150
  END
WHERE "duration" IS NOT NULL;

ALTER TABLE "RecurringTaskTemplate" DROP COLUMN "duration";

-- El enum ya no lo usa ninguna columna
DROP TYPE "Duration";

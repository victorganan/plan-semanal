-- Motor de recurrencia tipo Google Calendar: sustituye el enum simple
-- (semanal / quincenal / cada 4 semanas) por un patrón real tipo RRULE
-- (frecuencia + intervalo + días de la semana + fin), sin perder las
-- plantillas recurrentes ya configuradas.

-- 1. Libera el nombre "Recurrence" del enum antiguo
ALTER TYPE "Recurrence" RENAME TO "RecurrenceEnum_old";

-- 2. Enums nuevos
CREATE TYPE "Recurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
CREATE TYPE "RecurrenceFreq" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
CREATE TYPE "RecurrenceEndMode" AS ENUM ('NEVER', 'ON_DATE', 'AFTER_COUNT');

-- 3. Task.recurrence: solo es una etiqueta visual, se remapea al valor más
-- parecido (BIWEEKLY/FOUR_WEEKLY no tienen equivalente exacto en el nuevo
-- conjunto reducido; la cadencia real sigue viviendo en RecurringTaskTemplate).
ALTER TABLE "Task" ALTER COLUMN "recurrence" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "recurrence" TYPE "Recurrence" USING (
  CASE "recurrence"::text
    WHEN 'NONE' THEN 'NONE'
    WHEN 'WEEKLY' THEN 'WEEKLY'
    WHEN 'BIWEEKLY' THEN 'WEEKLY'
    WHEN 'FOUR_WEEKLY' THEN 'MONTHLY'
  END
)::"Recurrence";
ALTER TABLE "Task" ALTER COLUMN "recurrence" SET DEFAULT 'NONE';

-- 4. RecurringTaskTemplate: nuevas columnas del patrón de repetición
ALTER TABLE "RecurringTaskTemplate" ADD COLUMN "dtstart" TIMESTAMP(3);
ALTER TABLE "RecurringTaskTemplate" ADD COLUMN "freq" "RecurrenceFreq";
ALTER TABLE "RecurringTaskTemplate" ADD COLUMN "interval" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "RecurringTaskTemplate" ADD COLUMN "byWeekdays" INTEGER[] NOT NULL DEFAULT '{}';
ALTER TABLE "RecurringTaskTemplate" ADD COLUMN "monthlyByNthWeekday" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RecurringTaskTemplate" ADD COLUMN "endMode" "RecurrenceEndMode" NOT NULL DEFAULT 'NEVER';
ALTER TABLE "RecurringTaskTemplate" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "RecurringTaskTemplate" ADD COLUMN "endCount" INTEGER;

-- Traslada cada plantilla existente (semana ISO + día de la semana +
-- cadencia semanal/quincenal/cada-4-semanas) a una regla real: la fecha de
-- referencia (dtstart) es la fecha exacta de esa semana+día, freq=WEEKLY,
-- el intervalo refleja la cadencia antigua y byWeekdays recoge ese día.
-- Fórmula ISO-semana → fecha verificada contra la misma lógica que usa la
-- app en src/lib/week.ts (probada con casos límite de fin de año y W53).
UPDATE "RecurringTaskTemplate"
SET
  "dtstart" = TO_DATE(
    substring("startIsoWeek", 1, 4) || '-W' || substring("startIsoWeek", 7, 2) || '-' || ("dayOfWeek" + 1)::text,
    'IYYY-"W"IW-ID'
  ),
  "freq" = 'WEEKLY',
  "interval" = CASE "recurrence"::text
    WHEN 'WEEKLY' THEN 1
    WHEN 'BIWEEKLY' THEN 2
    WHEN 'FOUR_WEEKLY' THEN 4
    ELSE 1
  END,
  "byWeekdays" = ARRAY["dayOfWeek"];

ALTER TABLE "RecurringTaskTemplate" ALTER COLUMN "dtstart" SET NOT NULL;
ALTER TABLE "RecurringTaskTemplate" ALTER COLUMN "freq" SET NOT NULL;

ALTER TABLE "RecurringTaskTemplate" DROP COLUMN "dayOfWeek";
ALTER TABLE "RecurringTaskTemplate" DROP COLUMN "recurrence";
ALTER TABLE "RecurringTaskTemplate" DROP COLUMN "startIsoWeek";

-- 5. El enum antiguo ya no lo usa ninguna columna
DROP TYPE "RecurrenceEnum_old";

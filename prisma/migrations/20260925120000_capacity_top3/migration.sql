-- Presupuesto de capacidad diaria (User) + Top 3 del día (Task).
-- Ambas columnas llevan valor por defecto: aditivo, sin transformar datos existentes.

ALTER TABLE "User" ADD COLUMN "dailyCapacityMinutes" INTEGER NOT NULL DEFAULT 300;
ALTER TABLE "Task" ADD COLUMN "isTop3" BOOLEAN NOT NULL DEFAULT false;

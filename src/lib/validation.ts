import { z } from 'zod';

// Duración estimada en minutos: opcional, siempre en pasos de 15' (0h15, 0h30... 7h15...).
export const durationMinutesSchema = z
  .number()
  .int()
  .min(15)
  .max(24 * 60)
  .refine((v) => v % 15 === 0, { message: 'La duración debe ser en pasos de 15 minutos' })
  .nullable()
  .optional();

// Tiempo ejecutado en minutos: se puede fijar a mano (sin restricción de pasos) o
// acumular automáticamente en incrementos irregulares (p.ej. 25' de un Pomodoro).
export const executedMinutesSchema = z.number().int().min(0).max(999 * 60).optional();

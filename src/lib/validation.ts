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

import { z } from 'zod';

export const personInclude = { areas: { select: { id: true } } } as const;

export const personSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.union([z.literal('').transform(() => null), z.string().trim().email().max(200), z.null()]).optional(),
  areaIds: z.array(z.string()).max(50).optional(),
});

export type PersonDTO = { id: string; name: string; email: string | null; areas: { id: string }[] };

// Orden del desplegable: primero quien colabora en el área de la tarea,
// después el resto (filtrado sin bloquear: si el área no tiene personas
// asignadas, se ven todas en un solo grupo).
export function splitPeopleByArea(people: PersonDTO[], areaId: string | null | undefined) {
  const inArea = areaId ? people.filter((p) => p.areas.some((a) => a.id === areaId)) : [];
  if (inArea.length === 0) return { inArea: [], others: people };
  return { inArea, others: people.filter((p) => !inArea.includes(p)) };
}

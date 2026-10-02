import { describe, expect, it } from 'vitest';
import { personSchema, splitPeopleByArea, type PersonDTO } from './people';

const ana: PersonDTO = { id: '1', name: 'Ana', email: null, areas: [{ id: 'a1' }] };
const luis: PersonDTO = { id: '2', name: 'Luis', email: null, areas: [] };

describe('splitPeopleByArea', () => {
  it('pone primero a quien colabora en el área de la tarea', () => {
    expect(splitPeopleByArea([ana, luis], 'a1')).toEqual({ inArea: [ana], others: [luis] });
  });
  it('sin personas en el área (o sin área) muestra a todas', () => {
    expect(splitPeopleByArea([ana, luis], 'a2')).toEqual({ inArea: [], others: [ana, luis] });
    expect(splitPeopleByArea([ana, luis], null)).toEqual({ inArea: [], others: [ana, luis] });
  });
});

describe('personSchema', () => {
  it('recorta el nombre y acepta email vacío como null', () => {
    expect(personSchema.parse({ name: '  Ana ', email: '' })).toEqual({ name: 'Ana', email: null });
  });
  it('rechaza nombre vacío y email inválido', () => {
    expect(personSchema.safeParse({ name: '  ' }).success).toBe(false);
    expect(personSchema.safeParse({ name: 'Ana', email: 'no-es-email' }).success).toBe(false);
  });
});

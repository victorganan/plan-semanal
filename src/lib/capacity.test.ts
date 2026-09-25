import { describe, expect, it } from 'vitest';
import { summarizeLoad, effectiveCapacity, loadColor } from './capacity';

function task(fields: { gtdStatus?: 'ACTIVA' | 'ESPERANDO' | 'ALGUN_DIA'; durationMinutes?: number | null }) {
  return { gtdStatus: 'ACTIVA', durationMinutes: null, ...fields } as { gtdStatus: 'ACTIVA' | 'ESPERANDO' | 'ALGUN_DIA'; durationMinutes: number | null };
}

describe('summarizeLoad', () => {
  it('suma la duración estimada de las tareas activas', () => {
    expect(summarizeLoad([task({ durationMinutes: 60 }), task({ durationMinutes: 30 })])).toEqual({
      plannedMinutes: 90,
      unestimatedCount: 0,
    });
  });

  it('cuenta 30 min por defecto una tarea sin duración, y avisa de ello', () => {
    expect(summarizeLoad([task({ durationMinutes: null })])).toEqual({ plannedMinutes: 30, unestimatedCount: 1 });
  });

  it('excluye tareas Esperando y Algún día', () => {
    const tasks = [
      task({ durationMinutes: 60 }),
      task({ gtdStatus: 'ESPERANDO', durationMinutes: 120 }),
      task({ gtdStatus: 'ALGUN_DIA', durationMinutes: 120 }),
    ];
    expect(summarizeLoad(tasks)).toEqual({ plannedMinutes: 60, unestimatedCount: 0 });
  });

  it('con la lista vacía da 0 y 0', () => {
    expect(summarizeLoad([])).toEqual({ plannedMinutes: 0, unestimatedCount: 0 });
  });
});

describe('effectiveCapacity', () => {
  it('aplica el margen por defecto (20%)', () => {
    expect(effectiveCapacity(300, 20)).toBe(240);
  });

  it('sin margen, la capacidad efectiva es la capacidad completa', () => {
    expect(effectiveCapacity(300, 0)).toBe(300);
  });

  it('redondea', () => {
    expect(effectiveCapacity(100, 15)).toBe(85);
  });
});

describe('loadColor', () => {
  it('verde hasta el 85% inclusive', () => {
    expect(loadColor(0)).toBe('ok');
    expect(loadColor(85)).toBe('ok');
  });

  it('ámbar entre 86% y 100% inclusive', () => {
    expect(loadColor(86)).toBe('warn');
    expect(loadColor(100)).toBe('warn');
  });

  it('rojo por encima del 100%', () => {
    expect(loadColor(101)).toBe('over');
    expect(loadColor(150)).toBe('over');
  });
});

import { describe, expect, it } from 'vitest';
import { isPendingProcess } from './inbox';
import type { TaskWithProject } from '@/types';

// Solo los campos que lee isPendingProcess; el resto no importa para esta regla.
function task(fields: Partial<Pick<TaskWithProject, 'done' | 'gtdStatus' | 'processedAt' | 'snoozeUntil'>>): TaskWithProject {
  return { done: false, gtdStatus: 'ACTIVA', processedAt: null, snoozeUntil: null, ...fields } as TaskWithProject;
}

describe('isPendingProcess', () => {
  it('cuenta una tarea activa sin procesar', () => {
    expect(isPendingProcess(task({ gtdStatus: 'ACTIVA', processedAt: null }))).toBe(true);
  });

  it('no cuenta una tarea activa ya procesada (organizada sin fecha)', () => {
    expect(isPendingProcess(task({ gtdStatus: 'ACTIVA', processedAt: new Date() }))).toBe(false);
  });

  it('cuenta una tarea Algún día cuyo recordatorio ya llegó (reaparición)', () => {
    const yesterday = new Date(Date.now() - 86400000);
    expect(isPendingProcess(task({ gtdStatus: 'ALGUN_DIA', processedAt: new Date(), snoozeUntil: yesterday }))).toBe(true);
  });

  it('cuenta una tarea Algún día con recordatorio de hoy mismo', () => {
    const now = new Date();
    expect(isPendingProcess(task({ gtdStatus: 'ALGUN_DIA', processedAt: new Date(), snoozeUntil: now }), now)).toBe(true);
  });

  it('no cuenta una tarea Algún día cuyo recordatorio es futuro', () => {
    const tomorrow = new Date(Date.now() + 86400000);
    expect(isPendingProcess(task({ gtdStatus: 'ALGUN_DIA', processedAt: new Date(), snoozeUntil: tomorrow }))).toBe(false);
  });

  it('no cuenta una tarea Algún día sin fecha de recordatorio', () => {
    expect(isPendingProcess(task({ gtdStatus: 'ALGUN_DIA', processedAt: new Date(), snoozeUntil: null }))).toBe(false);
  });

  it('no cuenta una tarea Esperando', () => {
    expect(isPendingProcess(task({ gtdStatus: 'ESPERANDO', processedAt: new Date() }))).toBe(false);
  });

  it('no cuenta una tarea completada, aunque cumpla las demás condiciones', () => {
    const yesterday = new Date(Date.now() - 86400000);
    expect(isPendingProcess(task({ done: true, gtdStatus: 'ALGUN_DIA', processedAt: new Date(), snoozeUntil: yesterday }))).toBe(false);
  });
});

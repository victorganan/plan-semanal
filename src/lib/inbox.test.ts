import { describe, expect, it } from 'vitest';
import { isPendingProcess, summarizeTriageSession } from './inbox';
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

describe('summarizeTriageSession', () => {
  it('da la Bandeja por vacía si no se saltó ninguna', () => {
    expect(summarizeTriageSession(3, 0)).toEqual({ allProcessed: true, processedCount: 3, remainingCount: 0 });
  });

  it('no da la Bandeja por vacía si se saltó alguna, aunque se procesaran las demás', () => {
    // Caso reportado: 3 tareas, se salta la 1ª y se procesan las otras 2.
    expect(summarizeTriageSession(3, 1)).toEqual({ allProcessed: false, processedCount: 2, remainingCount: 1 });
  });

  it('si se saltan todas, procesadas = 0', () => {
    expect(summarizeTriageSession(2, 2)).toEqual({ allProcessed: false, processedCount: 0, remainingCount: 2 });
  });
});

import { describe, expect, it } from 'vitest';
import { shouldIncrementRescheduleCount } from './reschedule';

const d = (iso: string) => new Date(iso);

describe('shouldIncrementRescheduleCount', () => {
  it('cuenta cuando se pospone a un día posterior', () => {
    expect(
      shouldIncrementRescheduleCount({
        done: false,
        previousEffectiveDate: d('2026-10-05T09:00:00Z'),
        nextEffectiveDate: d('2026-10-07T09:00:00Z'),
        movingToDeferred: false,
      })
    ).toBe(true);
  });

  it('no cuenta si se adelanta a un día anterior', () => {
    expect(
      shouldIncrementRescheduleCount({
        done: false,
        previousEffectiveDate: d('2026-10-07T09:00:00Z'),
        nextEffectiveDate: d('2026-10-05T09:00:00Z'),
        movingToDeferred: false,
      })
    ).toBe(false);
  });

  it('no cuenta la primera vez que se asigna fecha (no tenía antes)', () => {
    expect(
      shouldIncrementRescheduleCount({
        done: false,
        previousEffectiveDate: null,
        nextEffectiveDate: d('2026-10-07T09:00:00Z'),
        movingToDeferred: false,
      })
    ).toBe(false);
  });

  it('no cuenta si solo cambia la hora dentro del mismo día', () => {
    expect(
      shouldIncrementRescheduleCount({
        done: false,
        previousEffectiveDate: d('2026-10-05T09:00:00Z'),
        nextEffectiveDate: d('2026-10-05T18:30:00Z'),
        movingToDeferred: false,
      })
    ).toBe(false);
  });

  it('no cuenta si la tarea está completada', () => {
    expect(
      shouldIncrementRescheduleCount({
        done: true,
        previousEffectiveDate: d('2026-10-05T09:00:00Z'),
        nextEffectiveDate: d('2026-10-09T09:00:00Z'),
        movingToDeferred: false,
      })
    ).toBe(false);
  });

  it('no cuenta si el cambio la manda a Algún día o Esperando', () => {
    expect(
      shouldIncrementRescheduleCount({
        done: false,
        previousEffectiveDate: d('2026-10-05T09:00:00Z'),
        nextEffectiveDate: d('2026-10-09T09:00:00Z'),
        movingToDeferred: true,
      })
    ).toBe(false);
  });

  it('no cuenta si se le quita la fecha (nextEffectiveDate null)', () => {
    expect(
      shouldIncrementRescheduleCount({
        done: false,
        previousEffectiveDate: d('2026-10-05T09:00:00Z'),
        nextEffectiveDate: null,
        movingToDeferred: false,
      })
    ).toBe(false);
  });
});

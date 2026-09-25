import { describe, expect, it } from 'vitest';
import { nextBusinessDay, previousBusinessDay } from './week';

describe('nextBusinessDay', () => {
  it('lunes a jueves: el día siguiente, misma semana', () => {
    expect(nextBusinessDay('2026-W10', 0)).toEqual({ isoWeek: '2026-W10', dayOfWeek: 1 });
    expect(nextBusinessDay('2026-W10', 3)).toEqual({ isoWeek: '2026-W10', dayOfWeek: 4 });
  });

  it('viernes: el lunes de la semana siguiente', () => {
    expect(nextBusinessDay('2026-W10', 4)).toEqual({ isoWeek: '2026-W11', dayOfWeek: 0 });
  });

  it('sábado y domingo: también el lunes de la semana siguiente', () => {
    expect(nextBusinessDay('2026-W10', 5)).toEqual({ isoWeek: '2026-W11', dayOfWeek: 0 });
    expect(nextBusinessDay('2026-W10', 6)).toEqual({ isoWeek: '2026-W11', dayOfWeek: 0 });
  });
});

describe('previousBusinessDay', () => {
  it('martes a viernes: el día anterior, misma semana', () => {
    expect(previousBusinessDay('2026-W10', 1)).toEqual({ isoWeek: '2026-W10', dayOfWeek: 0 });
    expect(previousBusinessDay('2026-W10', 4)).toEqual({ isoWeek: '2026-W10', dayOfWeek: 3 });
  });

  it('lunes: el viernes de la semana anterior', () => {
    expect(previousBusinessDay('2026-W10', 0)).toEqual({ isoWeek: '2026-W09', dayOfWeek: 4 });
  });

  it('sábado y domingo: el viernes de la misma semana', () => {
    expect(previousBusinessDay('2026-W10', 5)).toEqual({ isoWeek: '2026-W10', dayOfWeek: 4 });
    expect(previousBusinessDay('2026-W10', 6)).toEqual({ isoWeek: '2026-W10', dayOfWeek: 4 });
  });

  it('deshace exactamente a nextBusinessDay entre semana', () => {
    const forward = nextBusinessDay('2026-W10', 2);
    expect(previousBusinessDay(forward.isoWeek, forward.dayOfWeek)).toEqual({ isoWeek: '2026-W10', dayOfWeek: 2 });
  });
});

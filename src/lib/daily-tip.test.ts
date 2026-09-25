import { describe, expect, it } from 'vitest';
import { dayOfYear, pickDailyTip } from './daily-tip';

describe('dayOfYear', () => {
  it('1 de enero es el día 1', () => {
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
  });

  it('31 de diciembre es el día 365 en año no bisiesto', () => {
    expect(dayOfYear(new Date(2026, 11, 31))).toBe(365);
  });
});

describe('pickDailyTip', () => {
  const tips = ['a', 'b', 'c'] as const;

  it('es estable para la misma fecha', () => {
    const date = new Date(2026, 5, 15);
    expect(pickDailyTip(tips, date)).toBe(pickDailyTip(tips, date));
  });

  it('rota según el día del año', () => {
    expect(pickDailyTip(tips, new Date(2026, 0, 1))).toBe(tips[1 % 3]);
    expect(pickDailyTip(tips, new Date(2026, 0, 2))).toBe(tips[2 % 3]);
    expect(pickDailyTip(tips, new Date(2026, 0, 3))).toBe(tips[3 % 3]);
    expect(pickDailyTip(tips, new Date(2026, 0, 4))).toBe(tips[4 % 3]);
  });
});

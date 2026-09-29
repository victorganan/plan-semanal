import { describe, expect, it } from 'vitest';
import { averageCompleted, shouldWarnOverload } from './priority-overload';

describe('averageCompleted', () => {
  it('devuelve 0 sin historial', () => {
    expect(averageCompleted([])).toBe(0);
  });

  it('calcula la media', () => {
    expect(averageCompleted([2, 4, 3, 3])).toBe(3);
  });
});

describe('shouldWarnOverload', () => {
  it('no avisa sin prioritarias esta semana', () => {
    expect(shouldWarnOverload(0, [2, 2, 2, 2])).toBe(false);
  });

  it('no avisa sin historial (media 0), salvo que ya haya más de 1', () => {
    expect(shouldWarnOverload(1, [])).toBe(false);
    expect(shouldWarnOverload(2, [])).toBe(true);
  });

  it('no avisa si está dentro de la media + 1', () => {
    expect(shouldWarnOverload(4, [3, 3, 3, 3])).toBe(false);
  });

  it('avisa si supera la media + 1', () => {
    expect(shouldWarnOverload(5, [3, 3, 3, 3])).toBe(true);
  });

  it('usa la media exacta, no redondeada', () => {
    // media = 2.5, +1 = 3.5: 4 supera, 3 no
    expect(shouldWarnOverload(4, [2, 3, 2, 3])).toBe(true);
    expect(shouldWarnOverload(3, [2, 3, 2, 3])).toBe(false);
  });
});

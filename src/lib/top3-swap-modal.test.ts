import { describe, expect, it } from 'vitest';
import { shouldIgnoreBackdropClick } from './top3-swap-modal';

describe('shouldIgnoreBackdropClick', () => {
  it('ignora un clic en el mismo instante en que se abrió el modal', () => {
    expect(shouldIgnoreBackdropClick(1000, 1000)).toBe(true);
  });

  it('ignora un clic pegado a la apertura (doble clic accidental)', () => {
    expect(shouldIgnoreBackdropClick(1000, 1150)).toBe(true);
  });

  it('no ignora un clic justo en el borde del margen', () => {
    expect(shouldIgnoreBackdropClick(1000, 1250)).toBe(false);
  });

  it('no ignora un clic deliberado, bastante después de abrir', () => {
    expect(shouldIgnoreBackdropClick(1000, 2000)).toBe(false);
  });

  it('permite ajustar el margen', () => {
    expect(shouldIgnoreBackdropClick(1000, 1400, 500)).toBe(true);
    expect(shouldIgnoreBackdropClick(1000, 1600, 500)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { adjacentPanel, isPanelKey, resolveSheetDrag, swipeDirection } from './panels';

describe('isPanelKey', () => {
  it('acepta solo los paneles existentes (para ?panel=)', () => {
    expect(isPanelKey('habitos')).toBe(true);
    expect(isPanelKey('nada')).toBe(false);
    expect(isPanelKey(null)).toBe(false);
  });
});

describe('adjacentPanel', () => {
  it('avanza y retrocede sin dar la vuelta', () => {
    expect(adjacentPanel('objetivos', 1)).toBe('proyectos');
    expect(adjacentPanel('objetivos', -1)).toBe('objetivos');
    expect(adjacentPanel('prioritarias', 1)).toBe('prioritarias');
  });
});

describe('resolveSheetDrag', () => {
  it('arrastre corto no cambia nada', () => {
    expect(resolveSheetDrag('half', 20)).toBe('half');
  });
  it('arriba amplía, abajo reduce y después cierra', () => {
    expect(resolveSheetDrag('half', -100)).toBe('full');
    expect(resolveSheetDrag('full', 100)).toBe('half');
    expect(resolveSheetDrag('half', 100)).toBe('close');
  });
});

describe('swipeDirection', () => {
  it('solo cuenta gestos claramente horizontales', () => {
    expect(swipeDirection(-100, 10)).toBe(1);
    expect(swipeDirection(100, 10)).toBe(-1);
    expect(swipeDirection(-100, 90)).toBe(null);
    expect(swipeDirection(-30, 0)).toBe(null);
  });
});

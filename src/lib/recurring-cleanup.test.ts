import { describe, expect, it } from 'vitest';
import { selectDuplicatesToDelete } from './recurring-cleanup';

function task(id: string, done = false) {
  return { id, done };
}

describe('selectDuplicatesToDelete', () => {
  it('sin exceso, no borra nada', () => {
    expect(selectDuplicatesToDelete([task('a'), task('b')], 2)).toEqual({ keepId: 'a', deleteIds: [], skippedReason: null });
  });

  it('con un duplicado, conserva la más antigua y borra la más reciente', () => {
    expect(selectDuplicatesToDelete([task('original'), task('regenerada')], 1)).toEqual({
      keepId: 'original',
      deleteIds: ['regenerada'],
      skippedReason: null,
    });
  });

  it('con dos duplicados de sobra, borra las dos más recientes', () => {
    expect(selectDuplicatesToDelete([task('a'), task('b'), task('c')], 1)).toEqual({
      keepId: 'a',
      deleteIds: ['b', 'c'],
      skippedReason: null,
    });
  });

  it('nunca borra si alguna de las que sobran está completada', () => {
    const result = selectDuplicatesToDelete([task('original'), task('regenerada', true)], 1);
    expect(result.deleteIds).toEqual([]);
    expect(result.skippedReason).not.toBeNull();
    expect(result.keepId).toBe('original');
  });

  it('la tarea completada más antigua nunca es candidata a borrado, sea cual sea el exceso', () => {
    const result = selectDuplicatesToDelete([task('completada', true), task('b'), task('c')], 1);
    expect(result.keepId).toBe('completada');
    // Las que sobran (b, c) no están completadas: se pueden borrar igualmente.
    expect(result.deleteIds).toEqual(['b', 'c']);
  });

  it('grupo vacío no falla', () => {
    expect(selectDuplicatesToDelete([], 1)).toEqual({ keepId: null, deleteIds: [], skippedReason: null });
  });
});

import { describe, expect, it } from 'vitest';
import { CLOSE_CHECK_IDS, PREP_OFFER_CHECK_IDS } from './day-close';

describe('PREP_OFFER_CHECK_IDS', () => {
  it('son todos ids válidos de CLOSE_CHECK_IDS', () => {
    for (const id of PREP_OFFER_CHECK_IDS) {
      expect(CLOSE_CHECK_IDS).toContain(id);
    }
  });

  it('son exactamente "tengo a mano lo necesario" y "reuniones preparadas"', () => {
    expect(PREP_OFFER_CHECK_IDS).toEqual(['firstTaskSupplies', 'meetingsReady']);
  });
});

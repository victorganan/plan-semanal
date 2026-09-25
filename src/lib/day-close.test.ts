import { describe, expect, it } from 'vitest';
import { closeChecksFromAnswers, offersPrepTask } from './day-close';

describe('closeChecksFromAnswers', () => {
  it('sin respuestas, no guarda nada', () => {
    expect(closeChecksFromAnswers({})).toEqual([]);
  });

  it('solo incluye los respondidos "Sí"', () => {
    expect(
      closeChecksFromAnswers({
        firstTaskReady: 'yes',
        firstTaskSupplies: 'no',
        someoneWaiting: 'yes',
      })
    ).toEqual(['firstTaskReady', 'someoneWaiting']);
  });

  it('respeta el orden de CLOSE_CHECK_IDS, no el de las respuestas', () => {
    expect(
      closeChecksFromAnswers({
        fixedTimeCommitment: 'yes',
        firstTaskReady: 'yes',
      })
    ).toEqual(['firstTaskReady', 'fixedTimeCommitment']);
  });
});

describe('offersPrepTask', () => {
  it('ofrece crear tarea al responder "No" a firstTaskSupplies', () => {
    expect(offersPrepTask('firstTaskSupplies', 'no')).toBe(true);
  });

  it('ofrece crear tarea al responder "No" a meetingsReady', () => {
    expect(offersPrepTask('meetingsReady', 'no')).toBe(true);
  });

  it('no ofrece nada al responder "Sí"', () => {
    expect(offersPrepTask('firstTaskSupplies', 'yes')).toBe(false);
  });

  it('no ofrece nada para otras comprobaciones aunque sea "No"', () => {
    expect(offersPrepTask('someoneWaiting', 'no')).toBe(false);
  });

  it('no ofrece nada sin responder', () => {
    expect(offersPrepTask('firstTaskSupplies', undefined)).toBe(false);
  });
});

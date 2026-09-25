// Comprobaciones del Cierre del día (Apéndice A.2.1). Ninguna es obligatoria;
// closeChecks solo guarda los ids respondidos "Sí" (el resto, sin responder
// o respondidos "No", simplemente no aparecen en el array).
export const CLOSE_CHECK_IDS = [
  'firstTaskReady',
  'firstTaskSupplies',
  'someoneWaiting',
  'meetingsReady',
  'fixedTimeCommitment',
] as const;

export type CloseCheckId = (typeof CLOSE_CHECK_IDS)[number];
export type CloseCheckAnswer = 'yes' | 'no';

// Responder "No" a estas dos ofrece crear en un toque una tarea "Preparar…".
export const PREP_OFFER_CHECK_IDS: CloseCheckId[] = ['firstTaskSupplies', 'meetingsReady'];

export function closeChecksFromAnswers(answers: Partial<Record<CloseCheckId, CloseCheckAnswer>>): string[] {
  return CLOSE_CHECK_IDS.filter((id) => answers[id] === 'yes');
}

export function offersPrepTask(id: CloseCheckId, answer: CloseCheckAnswer | undefined): boolean {
  return answer === 'no' && PREP_OFFER_CHECK_IDS.includes(id);
}

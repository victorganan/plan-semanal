// Comprobaciones del Cierre del día (Apéndice A.2.1): casillas opcionales,
// ninguna obligatoria. closeChecks solo guarda los ids marcados.
export const CLOSE_CHECK_IDS = [
  'firstTaskReady',
  'firstTaskSupplies',
  'someoneWaiting',
  'meetingsReady',
  'fixedTimeCommitment',
] as const;

export type CloseCheckId = (typeof CLOSE_CHECK_IDS)[number];

// Junto a estas dos, un enlace para crear en un toque una tarea "Preparar…".
export const PREP_OFFER_CHECK_IDS: CloseCheckId[] = ['firstTaskSupplies', 'meetingsReady'];

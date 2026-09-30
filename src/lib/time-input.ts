// Lógica pura del selector de hora escribible (M2 de PENDIENTE): máscara
// HH:MM, redondeo de minutos al cuarto de hora y desplazamiento ±15' para
// las flechas de teclado. Separado de TimeSelect.tsx para poder testearlo
// sin DOM.

// 60 es un candidato válido (no un minuto real): deja que 53-59 redondee a
// la hora siguiente en vez de "caer" a los 45 de la hora actual, que
// quedaría más lejos del valor escrito que pasar a :00.
const MINUTE_STEPS = [0, 15, 30, 45, 60];

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function roundToQuarterHour(m: number): number {
  return MINUTE_STEPS.reduce((closest, step) => (Math.abs(step - m) < Math.abs(closest - m) ? step : closest));
}

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '').slice(0, 4);
}

// Mientras se escribe: sin separador hasta el 3er dígito (ambiguo si son
// horas de 1 o 2 cifras), luego HH:MM.
export function formatDraft(digits: string): string {
  if (digits.length <= 2) return digits;
  // 3 dígitos: hora de 1 cifra (mismo criterio que parseDigitsToTime), para
  // que lo que se ve mientras se escribe coincida con lo que se confirma.
  if (digits.length === 3) return `${digits.slice(0, 1)}:${digits.slice(1, 3)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

// Al confirmar (blur/Enter): 1-2 dígitos = solo hora (minutos 00); 3 dígitos
// = hora de 1 cifra + minutos; 4 dígitos = HH + MM. Los minutos se redondean
// al cuarto de hora más cercano.
export function parseDigitsToTime(digits: string): string {
  if (!digits) return '';
  let hour: number;
  let minute: number;
  if (digits.length <= 2) {
    hour = parseInt(digits, 10);
    minute = 0;
  } else if (digits.length === 3) {
    hour = parseInt(digits.slice(0, 1), 10);
    minute = parseInt(digits.slice(1, 3), 10);
  } else {
    hour = parseInt(digits.slice(0, 2), 10);
    minute = parseInt(digits.slice(2, 4), 10);
  }
  hour = Math.min(23, Math.max(0, hour));
  minute = roundToQuarterHour(Math.min(59, Math.max(0, minute)));
  const wrappedHour = minute === 60 ? (hour + 1) % 24 : hour;
  return `${pad2(wrappedHour)}:${pad2(minute % 60)}`;
}

export function parseValue(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  return { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10) };
}

export function shiftQuarterHour(value: string, deltaMinutes: number): string {
  const parsed = parseValue(value) ?? { hour: 0, minute: 0 };
  const total = (parsed.hour * 60 + parsed.minute + deltaMinutes + 24 * 60) % (24 * 60);
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

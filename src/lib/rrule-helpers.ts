import { RRule } from 'rrule';
import { DAY_NAMES, mondayBasedDayOfWeek } from '@/lib/week';

const RRULE_WEEKDAYS = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU];

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const NTH_LABELS = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto'];

export type RecurrenceFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type RecurrenceEndMode = 'NEVER' | 'ON_DATE' | 'AFTER_COUNT';

export interface RecurrenceValue {
  freq: RecurrenceFreq;
  interval: number;
  byWeekdays: number[]; // 0=lunes..6=domingo, solo se usa si freq=WEEKLY
  monthlyByNthWeekday: boolean; // solo se usa si freq=MONTHLY
  endMode: RecurrenceEndMode;
  endDate: string | null; // yyyy-mm-dd
  endCount: number | null;
}

export function nthWeekdayOfMonth(date: Date): number {
  return Math.ceil(date.getUTCDate() / 7);
}

export function buildRRule(v: RecurrenceValue, dtstart: Date): RRule {
  const freqMap = { DAILY: RRule.DAILY, WEEKLY: RRule.WEEKLY, MONTHLY: RRule.MONTHLY, YEARLY: RRule.YEARLY };
  const options: ConstructorParameters<typeof RRule>[0] = {
    freq: freqMap[v.freq],
    interval: v.interval,
    dtstart,
  };
  if (v.freq === 'WEEKLY' && v.byWeekdays.length > 0) {
    options.byweekday = v.byWeekdays.map((d) => RRULE_WEEKDAYS[d]);
  }
  if (v.freq === 'MONTHLY' && v.monthlyByNthWeekday) {
    const dow = mondayBasedDayOfWeek(dtstart);
    options.byweekday = [RRULE_WEEKDAYS[dow].nth(nthWeekdayOfMonth(dtstart))];
  }
  if (v.endMode === 'ON_DATE' && v.endDate) options.until = new Date(`${v.endDate}T23:59:59Z`);
  if (v.endMode === 'AFTER_COUNT' && v.endCount) options.count = v.endCount;
  return new RRule(options);
}

export function describeRecurrence(v: RecurrenceValue, dtstart: Date): string {
  const dow = DAY_NAMES[mondayBasedDayOfWeek(dtstart)];
  let base: string;
  if (v.freq === 'DAILY') {
    base = v.interval === 1 ? 'Cada día' : `Cada ${v.interval} días`;
  } else if (v.freq === 'WEEKLY') {
    const days = v.byWeekdays.length
      ? v.byWeekdays
          .slice()
          .sort((a, b) => a - b)
          .map((d) => DAY_NAMES[d])
          .join(', ')
      : dow;
    base = v.interval === 1 ? `Cada semana (${days})` : `Cada ${v.interval} semanas (${days})`;
  } else if (v.freq === 'MONTHLY') {
    if (v.monthlyByNthWeekday) {
      const n = nthWeekdayOfMonth(dtstart);
      const nth = NTH_LABELS[n - 1] ?? `${n}º`;
      base = v.interval === 1 ? `Cada mes el ${nth} ${dow.toLowerCase()}` : `Cada ${v.interval} meses el ${nth} ${dow.toLowerCase()}`;
    } else {
      base = v.interval === 1 ? `Cada mes el día ${dtstart.getUTCDate()}` : `Cada ${v.interval} meses el día ${dtstart.getUTCDate()}`;
    }
  } else {
    base =
      v.interval === 1
        ? `Cada año el ${dtstart.getUTCDate()} de ${MONTH_NAMES[dtstart.getUTCMonth()]}`
        : `Cada ${v.interval} años el ${dtstart.getUTCDate()} de ${MONTH_NAMES[dtstart.getUTCMonth()]}`;
  }
  if (v.endMode === 'ON_DATE' && v.endDate) {
    base += `, hasta el ${new Date(`${v.endDate}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
  }
  if (v.endMode === 'AFTER_COUNT' && v.endCount) {
    base += `, ${v.endCount} ${v.endCount === 1 ? 'vez' : 'veces'}`;
  }
  return base;
}

export const PRESETS = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'] as const;
export type Preset = (typeof PRESETS)[number];

export function presetValue(preset: Preset, dtstart: Date): RecurrenceValue | null {
  const dow = mondayBasedDayOfWeek(dtstart);
  const base = { interval: 1, monthlyByNthWeekday: false, endMode: 'NEVER' as const, endDate: null, endCount: null };
  switch (preset) {
    case 'NONE':
      return null;
    case 'DAILY':
      return { ...base, freq: 'DAILY', byWeekdays: [] };
    case 'WEEKLY':
      return { ...base, freq: 'WEEKLY', byWeekdays: [dow] };
    case 'MONTHLY':
      return { ...base, freq: 'MONTHLY', byWeekdays: [], monthlyByNthWeekday: true };
    case 'YEARLY':
      return { ...base, freq: 'YEARLY', byWeekdays: [] };
    case 'CUSTOM':
      return { ...base, freq: 'WEEKLY', byWeekdays: [dow] };
  }
}

// Para mostrar el desplegable en el preset correcto en vez de forzar
// siempre "Personalizar" cuando el valor guardado coincide con uno simple.
export function matchingPreset(v: RecurrenceValue | null, dtstart: Date): Preset {
  if (!v) return 'NONE';
  if (v.endMode !== 'NEVER' || v.interval !== 1) return 'CUSTOM';
  const dow = mondayBasedDayOfWeek(dtstart);
  if (v.freq === 'DAILY') return 'DAILY';
  if (v.freq === 'WEEKLY' && v.byWeekdays.length === 1 && v.byWeekdays[0] === dow) return 'WEEKLY';
  if (v.freq === 'MONTHLY' && v.monthlyByNthWeekday) return 'MONTHLY';
  if (v.freq === 'YEARLY') return 'YEARLY';
  return 'CUSTOM';
}

// Etiquetas del desplegable principal, calculadas a partir de la fecha de
// referencia (como hace Google Calendar: "Cada semana el miércoles").
export function presetLabel(preset: Preset, dtstart: Date): string {
  const dow = DAY_NAMES[mondayBasedDayOfWeek(dtstart)].toLowerCase();
  switch (preset) {
    case 'NONE':
      return 'No se repite';
    case 'DAILY':
      return 'Cada día';
    case 'WEEKLY':
      return `Cada semana el ${dow}`;
    case 'MONTHLY': {
      const n = nthWeekdayOfMonth(dtstart);
      const nth = NTH_LABELS[n - 1] ?? `${n}º`;
      return `Cada mes el ${nth} ${dow}`;
    }
    case 'YEARLY':
      return `Cada año el ${dtstart.getUTCDate()} de ${MONTH_NAMES[dtstart.getUTCMonth()]}`;
    case 'CUSTOM':
      return 'Personalizar…';
  }
}

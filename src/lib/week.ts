// Utilidades de semana ISO (AAAA-Wnn), lunes como primer día (0) y domingo como último (6).

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getISOWeekParts(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function isoWeekOf(date: Date): string {
  const { year, week } = getISOWeekParts(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function currentIsoWeek(): string {
  return isoWeekOf(new Date());
}

export function isoWeekToMonday(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split('-W');
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const monday = new Date(mondayOfWeek1);
  monday.setUTCDate(mondayOfWeek1.getUTCDate() + (week - 1) * 7);
  return monday;
}

export function dateForDayOfWeek(isoWeek: string, dayOfWeek: number): Date {
  const monday = isoWeekToMonday(isoWeek);
  const d = new Date(monday);
  d.setUTCDate(monday.getUTCDate() + dayOfWeek);
  return d;
}

export function addWeeks(isoWeek: string, delta: number): string {
  const monday = isoWeekToMonday(isoWeek);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  return isoWeekOf(monday);
}

export function mondayBasedDayOfWeek(date: Date): number {
  const jsDay = date.getDay(); // 0=domingo..6=sábado
  return jsDay === 0 ? 6 : jsDay - 1; // 0=lunes..6=domingo
}

export function todayDayOfWeek(): number {
  return mondayBasedDayOfWeek(new Date());
}

export function weeksBetween(fromIsoWeek: string, toIsoWeek: string): number {
  const from = isoWeekToMonday(fromIsoWeek).getTime();
  const to = isoWeekToMonday(toIsoWeek).getTime();
  return Math.round((to - from) / (7 * 86400000));
}

export function formatWeekRange(isoWeek: string): string {
  const monday = isoWeekToMonday(isoWeek);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

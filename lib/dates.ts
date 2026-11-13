// Fechas locales en formato 'YYYY-MM-DD' (sin horas ni zonas): así se comparan como texto y se guardan tal cual.

export type DateKey = string;

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): DateKey {
  return toKey(new Date());
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Día `day` del mes indicado; si el mes es más corto, el último día (p. ej. 31 → 30/11). */
export function dayOfMonth(year: number, month: number, day: number): DateKey {
  const y = year + Math.floor(month / 12);
  const m = ((month % 12) + 12) % 12;
  return toKey(new Date(y, m, Math.min(day, daysInMonth(y, m))));
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

/** Suma meses conservando el día (ajustado al último día si no existe). */
export function addMonths(key: DateKey, months: number, day?: number): DateKey {
  const d = fromKey(key);
  return dayOfMonth(d.getFullYear(), d.getMonth() + months, day ?? d.getDate());
}

export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86400000);
}

export function monthKey(key: DateKey): string {
  return key.slice(0, 7);
}

export function monthStart(year: number, month: number): DateKey {
  return dayOfMonth(year, month, 1);
}

export function monthEnd(year: number, month: number): DateKey {
  return dayOfMonth(year, month, 31);
}

/** 08/11 */
export function shortDate(key: DateKey): string {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
}

/** 08/11/2026 */
export function longDate(key: DateKey): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

/** "Jueves 5 de noviembre" */
export function headerDate(key: DateKey): string {
  const d = fromKey(key);
  const wd = WEEKDAYS[d.getDay()];
  return `${wd[0].toUpperCase()}${wd.slice(1)} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export function monthName(month: number): string {
  const m = MONTHS[((month % 12) + 12) % 12];
  return m[0].toUpperCase() + m.slice(1);
}

export function monthShort(month: number): string {
  return MONTHS_SHORT[((month % 12) + 12) % 12];
}

/** Acepta "8/11/2026", "08-11-2026" o "2026-11-08". Devuelve null si no es una fecha válida. */
export function parseDateInput(text: string): DateKey | null {
  const t = text.trim();
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (dmy) [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else return null;
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m - 1)) return null;
  return toKey(new Date(y, m - 1, d));
}

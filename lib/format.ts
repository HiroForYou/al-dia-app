import { getSettings } from './settings';

// Montos al estilo del diseño: "S/ 3,600.00" (coma de miles, punto decimal, como en las apps de bancos peruanos).

export function currencySymbol(): string {
  return getSettings().currency === 'USD' ? 'US$' : 'S/';
}

function group(n: number, decimals: number): string {
  // Redondeo previo para evitar "1.00" con 1.005 y "-0.00" con restos de punto flotante.
  const f = Math.pow(10, decimals);
  n = Math.round((n + Math.sign(n) * Number.EPSILON) * f) / f;
  if (Math.abs(n) < 0.5 / f) n = 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + (dec ? `${withCommas}.${dec}` : withCommas);
}

/** S/ 3,600.00 */
export function money(n: number): string {
  return `${currencySymbol()} ${group(n, 2)}`;
}

/** S/ 3,845 (sin decimales si es entero; para resúmenes). */
export function moneyShort(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return `${currencySymbol()} ${group(rounded, Number.isInteger(rounded) ? 0 : 2)}`;
}

/** Número sin símbolo: 320 o 25.90. */
export function plain(n: number): string {
  return group(n, Number.isInteger(n) ? 0 : 2);
}

/**
 * Convierte lo que escribe la persona en número: "1,250.50", "S/. 50", "99,90", "1.250,50".
 * Devuelve null si no es un monto válido o si es negativo (ningún campo de la app admite negativos).
 */
export function parseAmount(text: string): number | null {
  let t = text.trim().replace(/^(S\/\.?|US\$|\$)\s*/i, '');
  if (/-/.test(t)) return null;
  t = t.replace(/[^\d.,]/g, '');
  if (!t) return null;
  // Coma decimal al final ("99,90", "1.250,50"): los puntos son de miles. Si no, las comas son de miles.
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(/,/g, '');
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function percent(n: number): string {
  return `${n.toFixed(2).replace(/\.?0+$/, '')} %`;
}

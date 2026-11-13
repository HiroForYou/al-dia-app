import type { IconName } from '../components/Icon';
import { addMonths, dayOfMonth, diffDays, fromKey, monthEnd, monthStart, todayKey, type DateKey } from './dates';
import { moneyShort, plain } from './format';
import {
  PERIOD_MONTHS,
  serviceIcon,
  subscriptionIcon,
  type AppData,
  type CreditCard,
  type ItemKind,
  type Loan,
  type Service,
  type Subscription,
} from './types';

// Motor de vencimientos: a partir de las reglas de cada producto (día de pago, periodicidad, cuotas)
// genera las fechas concretas de cobro y su estado. Nada de esto se guarda: se recalcula al vuelo.

export type DueStatus = 'vencido' | 'por_vencer' | 'pagado';
export type Category = 'tarjetas' | 'servicios' | 'suscripciones' | 'prestamos';

export interface DueItem {
  key: string;
  kind: ItemKind;
  id: string;
  title: string;
  icon: IconName;
  category: Category;
  due: DateKey;
  /** Importe de esta fecha; null si aún no se conoce (tarjeta sin estado de cuenta). */
  amount: number | null;
  status: DueStatus;
  paidAt?: DateKey;
  notify: boolean;
  /** Texto alternativo para la línea secundaria (exoneraciones). */
  subtitle?: string;
  /** Texto alternativo para el importe (exoneraciones: "S/ 320 de 500"). */
  amountLabel?: string;
}

const LOOKBACK_MONTHS = 12;
const MAX_STEPS = 400;

function statusFor(due: DateKey, paid: boolean, today: DateKey): DueStatus {
  if (paid) return 'pagado';
  return due < today ? 'vencido' : 'por_vencer';
}

// ---- Fechas por producto ----

/** Margen para asociar la fecha del estado de cuenta al vencimiento calculado (el banco la mueve unos días). */
const STATEMENT_MATCH_DAYS = 15;

/**
 * Vencimientos mensuales de una tarjeta. Si hay estado de cuenta, su fecha reemplaza al vencimiento calculado
 * más cercano (±15 días), salvo que ese vencimiento ya tenga un pago registrado.
 */
export function cardDates(card: CreditCard, from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  const start = fromKey(from);
  const y = start.getFullYear();
  let m = start.getMonth() - 1; // un mes antes por si el estado de cuenta adelanta la fecha
  const first = firstCardDue(card);
  const st = card.statement?.dueDate;
  for (let i = 0; i < MAX_STEPS; i++, m++) {
    let d = dayOfMonth(y, m, card.dueDay);
    if (st && !card.payments[d] && Math.abs(diffDays(st, d)) <= STATEMENT_MATCH_DAYS) d = st;
    if (d > to && dayOfMonth(y, m, card.dueDay) > to) break;
    if (d >= from && d <= to && d >= first && !out.includes(d)) out.push(d);
  }
  return out.sort();
}

function firstCardDue(card: CreditCard): DateKey {
  const c = fromKey(card.createdAt);
  const thisMonth = dayOfMonth(c.getFullYear(), c.getMonth(), card.dueDay);
  const first = thisMonth >= card.createdAt ? thisMonth : dayOfMonth(c.getFullYear(), c.getMonth() + 1, card.dueDay);
  // Un estado de cuenta cargado antes del primer vencimiento calculado también cuenta.
  if (card.statement && card.statement.dueDate < first) return card.statement.dueDate;
  return first;
}

/** Fechas a partir de un ancla cada `months` meses (servicios, suscripciones). */
function anchoredDates(anchor: DateKey, months: number, day: number, from: DateKey, to: DateKey, limit = MAX_STEPS): DateKey[] {
  const out: DateKey[] = [];
  for (let k = 0; k < limit; k++) {
    const d = addMonths(anchor, k * months, day);
    if (d > to) break;
    if (d >= from) out.push(d);
  }
  return out;
}

export function serviceDates(s: Service, from: DateKey, to: DateKey): DateKey[] {
  return anchoredDates(s.anchor, PERIOD_MONTHS[s.periodicity], s.dueDay, from, to);
}

export function subscriptionDates(s: Subscription, from: DateKey, to: DateKey): DateKey[] {
  return anchoredDates(s.anchor, PERIOD_MONTHS[s.periodicity], fromKey(s.anchor).getDate(), from, to);
}

export function loanDates(l: Loan, from: DateKey, to: DateKey): DateKey[] {
  return anchoredDates(l.firstDue, 1, fromKey(l.firstDue).getDate(), from, to, l.totalInstallments);
}

// ---- Ítems ----

export function cardTitle(c: CreditCard): string {
  return c.name ? `${c.bank} ${c.name}` : c.bank;
}

/**
 * Un vencimiento pasado de tarjeta solo cuenta si se pagó o si es el del estado de cuenta cargado: de los
 * demás no se sabe cuánto se debía (p. ej. meses anteriores a registrar la tarjeta) y no deben salir como atrasados.
 */
function cardDateRelevant(card: CreditCard, due: DateKey, today: DateKey): boolean {
  return due >= today || !!card.payments[due] || card.statement?.dueDate === due;
}

function cardAmount(card: CreditCard, due: DateKey): number | null {
  const paid = card.payments[due];
  if (paid) return paid.amount;
  if (card.statement && card.statement.dueDate === due) return card.statement.total;
  return null;
}

export function cardItem(card: CreditCard, due: DateKey, today: DateKey): DueItem {
  const paid = card.payments[due];
  return {
    key: `card:${card.id}:${due}`,
    kind: 'card',
    id: card.id,
    title: cardTitle(card),
    icon: 'card',
    category: 'tarjetas',
    due,
    amount: cardAmount(card, due),
    status: statusFor(due, !!paid, today),
    paidAt: paid?.paidAt,
    notify: card.notify,
  };
}

export function serviceAmount(s: Service, due: DateKey): number {
  return s.payments[due]?.amount ?? s.actuals[due] ?? s.estimate;
}

export function serviceItem(s: Service, due: DateKey, today: DateKey): DueItem {
  const paid = s.payments[due];
  return {
    key: `service:${s.id}:${due}`,
    kind: 'service',
    id: s.id,
    title: s.provider,
    icon: serviceIcon(s.category),
    category: 'servicios',
    due,
    amount: serviceAmount(s, due),
    status: statusFor(due, !!paid, today),
    paidAt: paid?.paidAt,
    notify: s.notify,
  };
}

/** Las suscripciones se cobran solas: lo pasado cuenta como pagado. */
export function subscriptionItem(s: Subscription, due: DateKey, today: DateKey): DueItem {
  const charged = due < today;
  return {
    key: `subscription:${s.id}:${due}`,
    kind: 'subscription',
    id: s.id,
    title: s.name,
    icon: subscriptionIcon(s),
    category: 'suscripciones',
    due,
    amount: s.price,
    status: charged ? 'pagado' : 'por_vencer',
    paidAt: charged ? due : undefined,
    notify: s.notify,
  };
}

export function loanItem(l: Loan, due: DateKey, today: DateKey): DueItem {
  const paid = l.payments[due];
  return {
    key: `loan:${l.id}:${due}`,
    kind: 'loan',
    id: l.id,
    title: l.type ? `${l.type} · ${l.lender}` : l.lender,
    icon: 'bank',
    category: 'prestamos',
    due,
    amount: paid?.amount ?? l.installment,
    status: statusFor(due, !!paid, today),
    paidAt: paid?.paidAt,
    notify: l.notify,
  };
}

/** Todas las fechas de cobro dentro del rango, de todos los productos. */
export function itemsInRange(data: AppData, from: DateKey, to: DateKey, today = todayKey()): DueItem[] {
  const out: DueItem[] = [];
  for (const c of data.cards) for (const d of cardDates(c, from, to)) if (cardDateRelevant(c, d, today)) out.push(cardItem(c, d, today));
  for (const s of data.services) for (const d of serviceDates(s, from, to)) out.push(serviceItem(s, d, today));
  for (const s of data.subscriptions) for (const d of subscriptionDates(s, from, to)) out.push(subscriptionItem(s, d, today));
  for (const l of data.loans) for (const d of loanDates(l, from, to)) out.push(loanItem(l, d, today));
  return out.sort((a, b) => (a.due === b.due ? a.title.localeCompare(b.title) : a.due < b.due ? -1 : 1));
}

/** Pagos atrasados anteriores a `before` (hasta un año atrás). */
export function overdueBefore(data: AppData, before: DateKey, today = todayKey()): DueItem[] {
  const from = addMonths(before, -LOOKBACK_MONTHS);
  return itemsInRange(data, from, before, today).filter((i) => i.status === 'vencido' && i.due < before);
}

// ---- Exoneración de membresía ----

/** Fin del ciclo de facturación actual: la próxima fecha de cierre (hoy incluido). */
export function cycleEnd(card: CreditCard, today = todayKey()): DateKey {
  const t = fromKey(today);
  const thisMonth = dayOfMonth(t.getFullYear(), t.getMonth(), card.closingDay);
  return thisMonth >= today ? thisMonth : dayOfMonth(t.getFullYear(), t.getMonth() + 1, card.closingDay);
}

export interface ExonerationInfo {
  card: CreditCard;
  spent: number;
  goal: number;
  missing: number;
  until: DateKey;
  met: boolean;
  progress: number;
}

export function exonerationInfo(card: CreditCard, today = todayKey()): ExonerationInfo | null {
  if (!card.minSpend || card.minSpend <= 0) return null;
  const until = cycleEnd(card, today);
  const spent = card.spendCycleEnd === until ? card.spent : 0;
  const missing = Math.max(0, card.minSpend - spent);
  return {
    card,
    spent,
    goal: card.minSpend,
    missing,
    until,
    met: missing === 0,
    progress: Math.min(1, spent / card.minSpend),
  };
}

export function exonerationItem(info: ExonerationInfo, today = todayKey()): DueItem {
  return {
    key: `exoneration:${info.card.id}:${info.until}`,
    kind: 'exoneration',
    id: info.card.id,
    title: `Exoneración ${info.card.bank}`,
    icon: 'card',
    category: 'tarjetas',
    due: info.until,
    amount: info.goal,
    status: info.met ? 'pagado' : info.until < today ? 'vencido' : 'por_vencer',
    notify: info.card.notify,
    subtitle: info.met ? 'Cumplido este ciclo' : `Faltan ${moneyShort(info.missing)} · hasta ${info.until.slice(8, 10)}/${info.until.slice(5, 7)}`,
    amountLabel: `${moneyShort(info.spent)} de ${plain(info.goal)}`,
  };
}

export function exonerationItems(data: AppData, today = todayKey()): DueItem[] {
  return data.cards
    .map((c) => exonerationInfo(c, today))
    .filter((x): x is ExonerationInfo => !!x)
    .map((x) => exonerationItem(x, today));
}

// ---- Vistas ----

const STATUS_ORDER: Record<DueStatus, number> = { vencido: 0, por_vencer: 1, pagado: 2 };

export function sortForList(items: DueItem[]): DueItem[] {
  return [...items].sort((a, b) =>
    a.status !== b.status ? STATUS_ORDER[a.status] - STATUS_ORDER[b.status] : a.due < b.due ? -1 : a.due > b.due ? 1 : 0,
  );
}

/** Inicio: lo atrasado + todo lo del mes en curso + las exoneraciones del ciclo. */
export function homeItems(data: AppData, today = todayKey()) {
  const t = fromKey(today);
  const from = monthStart(t.getFullYear(), t.getMonth());
  const to = monthEnd(t.getFullYear(), t.getMonth());
  const items = [...overdueBefore(data, from, today), ...itemsInRange(data, from, to, today), ...exonerationItems(data, today)];
  const sum = (s: DueStatus) =>
    items.filter((i) => i.kind !== 'exoneration' && i.status === s).reduce((acc, i) => acc + (i.amount ?? 0), 0);
  return {
    items: sortForList(items),
    totals: { vencido: sum('vencido'), por_vencer: sum('por_vencer'), pagado: sum('pagado') },
  };
}

/** Primera fecha abierta de un producto: la atrasada más antigua o, si no hay, la próxima. */
export function openOccurrence(dates: (from: DateKey, to: DateKey) => DateKey[], isPaid: (d: DateKey) => boolean, today = todayKey()): DateKey | null {
  const from = addMonths(today, -LOOKBACK_MONTHS);
  const to = addMonths(today, 24);
  const all = dates(from, to);
  return all.find((d) => !isPaid(d) && d < today) ?? all.find((d) => d >= today && !isPaid(d)) ?? null;
}

export function cardOpenDue(card: CreditCard, today = todayKey()): DateKey | null {
  return openOccurrence((f, t) => cardDates(card, f, t), (d) => !!card.payments[d] || !cardDateRelevant(card, d, today), today);
}

export function serviceOpenDue(s: Service, today = todayKey()): DateKey | null {
  return openOccurrence((f, t) => serviceDates(s, f, t), (d) => !!s.payments[d], today);
}

export function loanOpenDue(l: Loan, today = todayKey()): DateKey | null {
  return openOccurrence((f, t) => loanDates(l, f, t), (d) => !!l.payments[d], today);
}

export function subscriptionNextCharge(s: Subscription, today = todayKey()): DateKey | null {
  return subscriptionDates(s, today, addMonths(today, 13))[0] ?? null;
}

/** Interés de un mes si solo se paga el mínimo (TEA → tasa mensual efectiva). */
export function minPaymentInterest(card: CreditCard): number | null {
  if (!card.statement || card.tea === null) return null;
  const monthly = Math.pow(1 + card.tea / 100, 1 / 12) - 1;
  return Math.max(0, card.statement.total - card.statement.minimum) * monthly;
}

// ---- Préstamos ----

/** Fechas de todas las cuotas del préstamo. */
export function loanSchedule(l: Loan): DateKey[] {
  return loanDates(l, l.firstDue, addMonths(l.firstDue, l.totalInstallments));
}

export function loanProgress(l: Loan) {
  // Solo cuentan los pagos que caen en una cuota del calendario actual.
  const paid = loanSchedule(l).filter((d) => !!l.payments[d]).length;
  const remaining = Math.max(0, l.totalInstallments - paid);
  let balance: number;
  if (l.rate && l.rate > 0) {
    // Saldo de capital con cuota fija (método francés).
    const i = Math.pow(1 + l.rate / 100, 1 / 12) - 1;
    const g = Math.pow(1 + i, paid);
    balance = Math.max(0, l.principal * g - l.installment * ((g - 1) / i));
  } else {
    balance = (l.principal * remaining) / Math.max(1, l.totalInstallments);
  }
  if (remaining === 0) balance = 0;
  return { paid, remaining, balance, progress: paid / Math.max(1, l.totalInstallments), current: Math.min(paid + 1, l.totalInstallments) };
}

// ---- Estadísticas ----

export function monthTotal(data: AppData, year: number, month: number, today = todayKey()): number {
  return itemsInRange(data, monthStart(year, month), monthEnd(year, month), today).reduce((acc, i) => acc + (i.amount ?? 0), 0);
}

export function monthByCategory(data: AppData, year: number, month: number, today = todayKey()): Record<Category, number> {
  const out: Record<Category, number> = { tarjetas: 0, servicios: 0, suscripciones: 0, prestamos: 0 };
  for (const i of itemsInRange(data, monthStart(year, month), monthEnd(year, month), today)) out[i.category] += i.amount ?? 0;
  return out;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  tarjetas: 'Tarjetas',
  servicios: 'Servicios',
  suscripciones: 'Suscripciones',
  prestamos: 'Préstamos',
};

/** Ruta del detalle de un ítem. */
export function itemHref(item: Pick<DueItem, 'kind' | 'id'>): string {
  switch (item.kind) {
    case 'card':
      return `/card/${item.id}`;
    case 'service':
      return `/service/${item.id}`;
    case 'subscription':
      return `/subscription/${item.id}`;
    case 'loan':
      return `/loan/${item.id}`;
    case 'exoneration':
      return `/card/statement?id=${item.id}`;
  }
}

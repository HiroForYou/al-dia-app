import { todayKey } from './dates';
import {
  PERIOD_MONTHS,
  SERVICE_CATEGORIES,
  SUBSCRIPTION_CATEGORIES,
  type AppData,
  type CreditCard,
  type Loan,
  type Payments,
  type Periodicity,
  type Service,
  type Subscription,
} from './types';

// Validación de datos leídos de disco o de una copia importada. Cada registro se completa con valores por
// defecto o se descarta si le falta lo esencial: un dato mal formado nunca debe llegar al render.

type Obj = Record<string, unknown>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, def = '') => (typeof v === 'string' ? v : def);
const num = (v: unknown, def = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : def);
const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const bool = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def);
const date = (v: unknown): string | null => (typeof v === 'string' && DATE_RE.test(v) ? v : null);
const day = (v: unknown, def: number) => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 31 ? v : def);
const period = (v: unknown): Periodicity => (typeof v === 'string' && v in PERIOD_MONTHS ? (v as Periodicity) : 'mensual');

function payments(v: unknown): Payments {
  const out: Payments = {};
  if (!isObj(v)) return out;
  for (const [k, p] of Object.entries(v)) {
    if (DATE_RE.test(k) && isObj(p)) out[k] = { paidAt: date(p.paidAt) ?? k, amount: num(p.amount) };
  }
  return out;
}

function amounts(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(v)) return out;
  for (const [k, n] of Object.entries(v)) if (DATE_RE.test(k) && typeof n === 'number' && n >= 0) out[k] = n;
  return out;
}

function card(v: unknown): CreditCard | null {
  if (!isObj(v) || !str(v.id)) return null;
  const st = isObj(v.statement) && date(v.statement.dueDate) ? v.statement : null;
  return {
    id: str(v.id),
    bank: str(v.bank, 'Tarjeta'),
    last4: str(v.last4).replace(/\D/g, '').slice(0, 4),
    name: str(v.name),
    closingDay: day(v.closingDay, 1),
    dueDay: day(v.dueDay, 1),
    tea: numOrNull(v.tea),
    creditLimit: numOrNull(v.creditLimit),
    minSpend: num(v.minSpend),
    membershipFee: num(v.membershipFee),
    spent: num(v.spent),
    spendCycleEnd: date(v.spendCycleEnd),
    statement: st ? { total: num(st.total), minimum: num(st.minimum), dueDate: date(st.dueDate)! } : null,
    notify: bool(v.notify, true),
    payments: payments(v.payments),
    createdAt: date(v.createdAt) ?? todayKey(),
  };
}

function service(v: unknown): Service | null {
  if (!isObj(v) || !str(v.id) || !date(v.anchor)) return null;
  const category = SERVICE_CATEGORIES.some((c) => c.key === v.category) ? (v.category as Service['category']) : 'otro';
  return {
    id: str(v.id),
    category,
    provider: str(v.provider, 'Servicio'),
    estimate: num(v.estimate),
    variable: bool(v.variable, false),
    dueDay: day(v.dueDay, 1),
    periodicity: period(v.periodicity),
    anchor: date(v.anchor)!,
    supplyNumber: str(v.supplyNumber),
    notify: bool(v.notify, true),
    actuals: amounts(v.actuals),
    payments: payments(v.payments),
    createdAt: date(v.createdAt) ?? todayKey(),
  };
}

function subscription(v: unknown): Subscription | null {
  if (!isObj(v) || !str(v.id) || !date(v.anchor)) return null;
  const category = SUBSCRIPTION_CATEGORIES.some((c) => c.key === v.category) ? (v.category as Subscription['category']) : 'otro';
  return {
    id: str(v.id),
    kind: v.kind === 'membresia' ? 'membresia' : 'suscripcion',
    category,
    name: str(v.name, 'Suscripción'),
    price: num(v.price),
    periodicity: period(v.periodicity),
    anchor: date(v.anchor)!,
    notify: bool(v.notify, true),
    createdAt: date(v.createdAt) ?? todayKey(),
  };
}

function loan(v: unknown): Loan | null {
  if (!isObj(v) || !str(v.id) || !date(v.firstDue)) return null;
  const total = typeof v.totalInstallments === 'number' && v.totalInstallments >= 1 ? Math.floor(v.totalInstallments) : 1;
  return {
    id: str(v.id),
    lender: str(v.lender, 'Entidad'),
    type: str(v.type),
    principal: num(v.principal),
    installment: num(v.installment),
    totalInstallments: total,
    firstDue: date(v.firstDue)!,
    rate: numOrNull(v.rate),
    notify: bool(v.notify, true),
    payments: payments(v.payments),
    createdAt: date(v.createdAt) ?? todayKey(),
  };
}

const keep = <T>(list: unknown, fn: (v: unknown) => T | null): T[] =>
  Array.isArray(list) ? list.map(fn).filter((x): x is T => x !== null) : [];

/** Devuelve un documento válido o null si no parece un documento de Al Día. */
export function sanitizeData(raw: unknown): AppData | null {
  if (!isObj(raw)) return null;
  if (!['cards', 'services', 'subscriptions', 'loans'].some((k) => Array.isArray(raw[k]))) return null;
  return {
    version: 1,
    cards: keep(raw.cards, card),
    services: keep(raw.services, service),
    subscriptions: keep(raw.subscriptions, subscription),
    loans: keep(raw.loans, loan),
  };
}

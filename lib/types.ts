import type { DateKey } from './dates';
import type { IconName } from '../components/Icon';

// Modelo de datos. Todo vive en el celular (AsyncStorage) y se exporta tal cual en la copia de seguridad.

export type Periodicity = 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';

export const PERIOD_MONTHS: Record<Periodicity, number> = {
  mensual: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export const PERIOD_LABELS: Record<Periodicity, string> = {
  mensual: 'Mensual',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

/** Un pago registrado, indexado por la fecha de vencimiento que cubre. */
export interface Payment {
  paidAt: DateKey;
  amount: number;
}

export type Payments = Record<DateKey, Payment>;

export interface Statement {
  total: number;
  minimum: number;
  dueDate: DateKey;
}

export interface CreditCard {
  id: string;
  bank: string;
  last4: string;
  name: string;
  closingDay: number;
  dueDay: number;
  /** Tasa efectiva anual en %. */
  tea: number | null;
  creditLimit: number | null;
  /** Consumo mínimo por ciclo para no pagar membresía (0 = sin exoneración). */
  minSpend: number;
  membershipFee: number;
  /** Consumo acumulado en el ciclo que termina en `spendCycleEnd`. */
  spent: number;
  spendCycleEnd: DateKey | null;
  statement: Statement | null;
  notify: boolean;
  payments: Payments;
  createdAt: DateKey;
}

export type ServiceCategory =
  | 'luz'
  | 'agua'
  | 'gas'
  | 'internet'
  | 'telefono'
  | 'cable'
  | 'seguro'
  | 'educacion'
  | 'alquiler'
  | 'otro';

export interface Service {
  id: string;
  category: ServiceCategory;
  provider: string;
  estimate: number;
  variable: boolean;
  dueDay: number;
  periodicity: Periodicity;
  /** Primer vencimiento: ancla para periodicidades mayores a un mes. */
  anchor: DateKey;
  supplyNumber: string;
  notify: boolean;
  /** Importe real de recibos puntuales, por fecha de vencimiento. */
  actuals: Record<DateKey, number>;
  payments: Payments;
  createdAt: DateKey;
}

export type SubscriptionKind = 'suscripcion' | 'membresia';

export type SubscriptionCategory = 'streaming' | 'musica' | 'software' | 'gimnasio' | 'seguro' | 'educacion' | 'otro';

export interface Subscription {
  id: string;
  kind: SubscriptionKind;
  category: SubscriptionCategory;
  name: string;
  price: number;
  periodicity: Periodicity;
  /** Un cobro conocido (el próximo al crearla); los demás se calculan desde aquí. */
  anchor: DateKey;
  notify: boolean;
  createdAt: DateKey;
}

export interface Loan {
  id: string;
  lender: string;
  type: string;
  principal: number;
  installment: number;
  totalInstallments: number;
  /** Fecha de la primera cuota; las siguientes son mensuales el mismo día. */
  firstDue: DateKey;
  /** Tasa anual en %. */
  rate: number | null;
  notify: boolean;
  payments: Payments;
  createdAt: DateKey;
}

export interface AppData {
  version: 1;
  cards: CreditCard[];
  services: Service[];
  subscriptions: Subscription[];
  loans: Loan[];
}

export type ItemKind = 'card' | 'service' | 'subscription' | 'loan' | 'exoneration';

export const SERVICE_CATEGORIES: { key: ServiceCategory; label: string; short: string; icon: IconName }[] = [
  { key: 'luz', label: 'Electricidad', short: 'Luz', icon: 'bolt' },
  { key: 'agua', label: 'Agua', short: 'Agua', icon: 'drop' },
  { key: 'gas', label: 'Gas', short: 'Gas', icon: 'flame' },
  { key: 'internet', label: 'Internet', short: 'Internet', icon: 'wifi' },
  { key: 'telefono', label: 'Telefonía', short: 'Teléfono', icon: 'phone' },
  { key: 'cable', label: 'Cable', short: 'Cable', icon: 'tv' },
  { key: 'seguro', label: 'Seguros', short: 'Seguro', icon: 'shield' },
  { key: 'educacion', label: 'Educación', short: 'Educación', icon: 'book' },
  { key: 'alquiler', label: 'Alquiler', short: 'Alquiler', icon: 'home' },
  { key: 'otro', label: 'Otro', short: 'Otro', icon: 'receipt' },
];

export const SUBSCRIPTION_CATEGORIES: { key: SubscriptionCategory; label: string; icon: IconName }[] = [
  { key: 'streaming', label: 'Streaming', icon: 'play' },
  { key: 'musica', label: 'Música', icon: 'play' },
  { key: 'software', label: 'Software', icon: 'code' },
  { key: 'gimnasio', label: 'Gimnasio', icon: 'star' },
  { key: 'seguro', label: 'Seguro', icon: 'shield' },
  { key: 'educacion', label: 'Educación', icon: 'book' },
  { key: 'otro', label: 'Otro', icon: 'receipt' },
];

export function serviceIcon(category: ServiceCategory): IconName {
  return SERVICE_CATEGORIES.find((c) => c.key === category)?.icon ?? 'receipt';
}

export function subscriptionIcon(sub: Pick<Subscription, 'category' | 'kind'>): IconName {
  if (sub.kind === 'membresia' && sub.category === 'otro') return 'star';
  return SUBSCRIPTION_CATEGORIES.find((c) => c.key === sub.category)?.icon ?? 'receipt';
}

export const BANKS = ['BCP', 'Interbank', 'BBVA', 'Scotiabank', 'BanBif', 'Banco Pichincha', 'Banco de la Nación', 'Falabella', 'Ripley', 'Diners Club', 'Otro'];

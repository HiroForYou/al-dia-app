import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { todayKey, type DateKey } from './dates';
import { sanitizeData } from './sanitize';
import type { AppData, CreditCard, Loan, Payment, Service, Subscription } from './types';

// Datos de la app: tarjetas, servicios, suscripciones/membresías y préstamos.
// Un solo documento en AsyncStorage; cada cambio se guarda entero (son pocos registros).

export const DATA_KEY = 'aldia.data.v1';

const EMPTY: AppData = { version: 1, cards: [], services: [], subscriptions: [], loans: [] };

let data: AppData = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: AppData) {
  data = next;
  emit();
  AsyncStorage.setItem(DATA_KEY, JSON.stringify(data)).catch(() => {});
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Valida un documento leído (de disco o de una copia); ver lib/sanitize.ts. */
export const normalizeData = sanitizeData;

export async function loadData(): Promise<void> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = sanitizeData(JSON.parse(raw));
      if (!parsed) throw new Error('documento inválido');
      data = parsed;
    }
  } catch {
    // Documento ilegible: se guarda aparte antes de que el próximo cambio lo sobrescriba.
    if (raw) AsyncStorage.setItem(`${DATA_KEY}.corrupt`, raw).catch(() => {});
  }
  loaded = true;
  emit();
}

export function getData(): AppData {
  return data;
}

export function isDataLoaded(): boolean {
  return loaded;
}

export function replaceData(next: AppData): void {
  commit(next);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeData(listener: () => void): () => void {
  return subscribe(listener);
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, () => data);
}

// ---- Genéricos por colección ----

type Collections = Omit<AppData, 'version'>;
type Entity<K extends keyof Collections> = Collections[K][number];

function upsert<K extends keyof Collections>(key: K, item: Entity<K>) {
  const list = data[key] as Entity<K>[];
  const exists = list.some((x) => x.id === item.id);
  const next = exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
  commit({ ...data, [key]: next });
}

function remove<K extends keyof Collections>(key: K, id: string) {
  commit({ ...data, [key]: (data[key] as Entity<K>[]).filter((x) => x.id !== id) });
}

function patch<K extends keyof Collections>(key: K, id: string, fn: (item: Entity<K>) => Entity<K>) {
  commit({ ...data, [key]: (data[key] as Entity<K>[]).map((x) => (x.id === id ? fn(x) : x)) });
}

// ---- Tarjetas ----

export const saveCard = (card: CreditCard) => upsert('cards', card);
export const deleteCard = (id: string) => remove('cards', id);
export const findCard = (id: string) => data.cards.find((c) => c.id === id);

export function updateCard(id: string, fn: (c: CreditCard) => CreditCard) {
  patch('cards', id, fn);
}

// ---- Servicios ----

export const saveService = (s: Service) => upsert('services', s);
export const deleteService = (id: string) => remove('services', id);
export const findService = (id: string) => data.services.find((s) => s.id === id);

export function setServiceActual(id: string, due: DateKey, amount: number | null) {
  patch('services', id, (s) => {
    const actuals = { ...s.actuals };
    if (amount === null) delete actuals[due];
    else actuals[due] = amount;
    return { ...s, actuals };
  });
}

// ---- Suscripciones ----

export const saveSubscription = (s: Subscription) => upsert('subscriptions', s);
export const deleteSubscription = (id: string) => remove('subscriptions', id);
export const findSubscription = (id: string) => data.subscriptions.find((s) => s.id === id);

// ---- Préstamos ----

export const saveLoan = (l: Loan) => upsert('loans', l);
export const deleteLoan = (id: string) => remove('loans', id);
export const findLoan = (id: string) => data.loans.find((l) => l.id === id);

// ---- Pagos (tarjetas, servicios y préstamos) ----

type PayableKey = 'cards' | 'services' | 'loans';

export function markPaid(key: PayableKey, id: string, due: DateKey, amount: number) {
  const payment: Payment = { paidAt: todayKey(), amount };
  patch(key, id, (item) => ({ ...item, payments: { ...item.payments, [due]: payment } }));
}

export function unmarkPaid(key: PayableKey, id: string, due: DateKey) {
  patch(key, id, (item) => {
    const payments = { ...item.payments };
    delete payments[due];
    return { ...item, payments };
  });
}

import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { todayKey, type DateKey } from './dates';

// Fecha de hoy como estado: cambia a medianoche y al volver la app a primer plano, para que los estados
// (Vencido / Por vencer) no se queden con el día anterior si la app sigue abierta.

let today = todayKey();
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function refresh() {
  const next = todayKey();
  if (next !== today) {
    today = next;
    listeners.forEach((l) => l());
  }
  scheduleMidnight();
}

function scheduleMidnight() {
  if (timer) clearTimeout(timer);
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  timer = setTimeout(refresh, next.getTime() - now.getTime());
}

let started = false;

function start() {
  if (started) return;
  started = true;
  scheduleMidnight();
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refresh();
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useToday(): DateKey {
  return useSyncExternalStore(subscribe, () => today);
}

export function subscribeToday(listener: () => void): () => void {
  return subscribe(listener);
}

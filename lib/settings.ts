import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// Preferencias de la app (Ajustes). Mismo patrón que los demás stores: estado en memoria, oyentes y
// copia en AsyncStorage.

const KEY = 'aldia.settings.v1';

export type Currency = 'PEN' | 'USD';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Settings {
  loaded: boolean;
  currency: Currency;
  theme: ThemeMode;
  notifications: boolean;
  /** Días de anticipación de los avisos (las suscripciones siempre avisan 1 día antes). */
  remindDays: number;
  /** Bloqueo con PIN (y huella si el equipo la tiene). El PIN vive en SecureStore. */
  lock: boolean;
  biometrics: boolean;
  /** Oculta el contenido en la vista de apps recientes (en Android también bloquea capturas de pantalla). */
  hideInRecents: boolean;
  introSeen: boolean;
}

let settings: Settings = {
  loaded: false,
  currency: 'PEN',
  theme: 'light',
  notifications: true,
  remindDays: 3,
  lock: false,
  biometrics: true,
  hideInRecents: false,
  introSeen: false,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function save() {
  const { loaded: _loaded, ...rest } = settings;
  AsyncStorage.setItem(KEY, JSON.stringify(rest)).catch(() => {});
}

export async function loadSettings(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) settings = { ...settings, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    // Se quedan los valores por defecto.
  }
  settings = { ...settings, loaded: true };
  emit();
}

export function getSettings(): Settings {
  return settings;
}

export function updateSettings(patch: Partial<Omit<Settings, 'loaded'>>): void {
  settings = { ...settings, ...patch };
  emit();
  save();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, () => settings);
}

export const CURRENCY_LABELS: Record<Currency, string> = { PEN: 'Soles (S/)', USD: 'Dólares (US$)' };
export const THEME_LABELS: Record<ThemeMode, string> = { light: 'Claro', dark: 'Oscuro', system: 'Según el sistema' };
export const REMIND_OPTIONS = [1, 2, 3, 5, 7];

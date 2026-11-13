import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { closeConfirm } from './confirm';
import { closePrompt } from './prompt';
import { getSettings, updateSettings } from './settings';
import { closeSheet } from './sheet';

// Bloqueo de la app con PIN de 4 dígitos y, si el equipo lo permite, huella o rostro.
// El PIN nunca se guarda en claro: solo su hash con sal, en SecureStore (Keystore/Keychain).

const PIN_KEY = 'aldia.pin.v1';
export const PIN_LENGTH = 4;
/** Tiempo en segundo plano tras el cual se vuelve a pedir el PIN. */
const RELOCK_MS = 30_000;

async function hash(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function setPin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  await SecureStore.setItemAsync(PIN_KEY, JSON.stringify({ salt, hash: await hash(pin, salt) }));
}

async function matches(pin: string): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(PIN_KEY);
  if (!raw) return false;
  const stored = JSON.parse(raw) as { salt: string; hash: string };
  return (await hash(pin, stored.salt)) === stored.hash;
}

// ---- Límite de intentos: tras 5 fallos seguidos, espera de 30 s que se duplica con cada fallo extra. ----

const ATTEMPTS_KEY = 'aldia.pinAttempts.v1';
const FREE_ATTEMPTS = 5;
const BASE_WAIT_MS = 30_000;

interface Attempts {
  fails: number;
  until: number;
}

async function readAttempts(): Promise<Attempts> {
  try {
    const raw = await SecureStore.getItemAsync(ATTEMPTS_KEY);
    if (raw) return JSON.parse(raw) as Attempts;
  } catch {
    // Sin registro previo.
  }
  return { fails: 0, until: 0 };
}

/** Milisegundos que faltan para poder volver a intentar (0 si no hay espera). */
export async function pinWaitMs(): Promise<number> {
  return Math.max(0, (await readAttempts()).until - Date.now());
}

export type PinCheck = { ok: true } | { ok: false; waitMs: number; left: number };

/** Verifica el PIN respetando el límite de intentos. */
export async function verifyPin(pin: string): Promise<PinCheck> {
  const a = await readAttempts();
  if (a.until > Date.now()) return { ok: false, waitMs: a.until - Date.now(), left: 0 };
  if (await matches(pin)) {
    if (a.fails) await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
    return { ok: true };
  }
  const fails = a.fails + 1;
  const over = fails - FREE_ATTEMPTS;
  const until = over >= 0 ? Date.now() + BASE_WAIT_MS * Math.pow(2, over) : 0;
  await SecureStore.setItemAsync(ATTEMPTS_KEY, JSON.stringify({ fails, until }));
  return { ok: false, waitMs: Math.max(0, until - Date.now()), left: Math.max(0, FREE_ATTEMPTS - fails) };
}

/** Mensaje para un intento fallido. */
export function pinFailMessage(check: Extract<PinCheck, { ok: false }>): string {
  if (check.waitMs > 0) return `Demasiados intentos. Espera ${Math.ceil(check.waitMs / 1000)} s.`;
  return check.left <= 2 ? `PIN incorrecto. Te quedan ${check.left} intentos.` : 'PIN incorrecto. Inténtalo de nuevo.';
}

export async function hasPin(): Promise<boolean> {
  return !!(await SecureStore.getItemAsync(PIN_KEY));
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
}

export async function biometricsAvailable(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

export async function authenticateBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear Al Día',
      cancelLabel: 'Usar PIN',
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}

/** Activa el bloqueo con el PIN recién creado. */
export async function enableLock(pin: string): Promise<void> {
  await setPin(pin);
  updateSettings({ lock: true });
}

export async function disableLock(): Promise<void> {
  await clearPin();
  updateSettings({ lock: false });
}

// ---- Estado de bloqueo ----

let locked = false;
let backgroundSince: number | null = null;
// Mientras un diálogo del sistema (selector de archivos, compartir) está abierto la app pasa a segundo
// plano: en ese caso se tolera más tiempo fuera antes de volver a bloquear.
let suspendRelock = false;
const RELOCK_SYSTEM_DIALOG_MS = 5 * 60_000;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function lockNow(): void {
  if (!getSettings().lock) return;
  // Diálogos y hojas abiertos son ventanas nativas que quedarían encima del bloqueo: se cierran.
  closeConfirm();
  closeSheet();
  closePrompt();
  locked = true;
  emit();
}

export function unlock(): void {
  locked = false;
  emit();
}

export async function withoutRelock<T>(fn: () => Promise<T>): Promise<T> {
  suspendRelock = true;
  try {
    return await fn();
  } finally {
    setTimeout(() => {
      suspendRelock = false;
    }, 1000);
  }
}

export function startLockWatcher(): () => void {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'background') backgroundSince = Date.now();
    if (state === 'active' && backgroundSince !== null) {
      const away = Date.now() - backgroundSince;
      backgroundSince = null;
      if (away > (suspendRelock ? RELOCK_SYSTEM_DIALOG_MS : RELOCK_MS)) lockNow();
    }
  });
  return () => sub.remove();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLocked(): boolean {
  return useSyncExternalStore(subscribe, () => locked);
}

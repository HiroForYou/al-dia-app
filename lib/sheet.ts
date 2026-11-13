import { useSyncExternalStore } from 'react';

// Hoja inferior para elegir una opción (banco, periodicidad, tema...). Se abre con pickOption() y la
// muestra OptionSheetHost, montado en el layout raíz.

export interface SheetOption<T extends string | number = string | number> {
  value: T;
  label: string;
  description?: string;
}

export interface SheetRequest {
  title: string;
  options: SheetOption[];
  selected?: string | number;
  onPick: (value: string | number) => void;
}

let pending: SheetRequest | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function pickOption<T extends string | number>(req: {
  title: string;
  options: SheetOption<T>[];
  selected?: T;
  onPick: (value: T) => void;
}): void {
  pending = req as unknown as SheetRequest;
  emit();
}

export function closeSheet(): void {
  pending = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSheetRequest(): SheetRequest | null {
  return useSyncExternalStore(subscribe, () => pending);
}

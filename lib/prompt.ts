import { useSyncExternalStore } from 'react';

// Diálogo para pedir un monto ("¿Cuánto pagaste?"). Se abre con promptAmount() y lo muestra PromptHost,
// montado en el layout raíz.

export interface PromptRequest {
  title: string;
  message?: string;
  initial?: string;
  confirmLabel?: string;
  onSubmit: (amount: number) => void;
}

let pending: PromptRequest | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function promptAmount(req: PromptRequest): void {
  pending = req;
  emit();
}

export function closePrompt(): void {
  if (!pending) return;
  pending = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePromptRequest(): PromptRequest | null {
  return useSyncExternalStore(subscribe, () => pending);
}

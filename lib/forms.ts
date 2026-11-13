import { useNavigation, type useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { askConfirm } from './confirm';

/**
 * Pregunta antes de salir de un formulario con cambios sin guardar (botón Volver, gesto o tecla atrás).
 * `snapshot` es el estado del formulario serializado; se compara con el del primer render.
 * Devuelve `allowLeave()`, que se llama justo antes de salir tras guardar o eliminar.
 */
export function useUnsavedGuard(snapshot: string): () => void {
  const navigation = useNavigation();
  const [initial] = useState(snapshot);
  const allowed = useRef(false);
  const dirty = snapshot !== initial;

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (!dirty || allowed.current) return;
        e.preventDefault();
        askConfirm({
          title: '¿Descartar cambios?',
          message: 'Tienes cambios sin guardar en este formulario.',
          confirmLabel: 'Descartar',
          onConfirm: () => navigation.dispatch(e.data.action),
        });
      }),
    [navigation, dirty],
  );

  return () => {
    allowed.current = true;
  };
}

// Utilidades de los formularios.

/**
 * Evita guardar dos veces con toques rápidos. La acción devuelve false si la validación falló: en ese caso
 * se puede volver a intentar.
 */
export function useSubmitOnce(action: () => boolean | void): () => void {
  const busy = useRef(false);
  return () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (action() === false) busy.current = false;
    } catch (e) {
      busy.current = false;
      throw e;
    }
  };
}

/**
 * Tras eliminar desde el formulario de edición (que siempre se abre sobre el detalle), cierra ambos y
 * vuelve a donde estaba la persona: Inicio, Calendario, una lista de Productos...
 */
export function leaveAfterDelete(router: ReturnType<typeof useRouter>): void {
  if (router.canDismiss()) router.dismiss(2);
  else router.replace('/');
}

/** Error para un campo numérico opcional: vacío es válido, texto no numérico o negativo no. */
export function optionalNumberError(text: string, parsed: number | null): string | null {
  return text.trim() !== '' && parsed === null ? 'Número no válido' : null;
}

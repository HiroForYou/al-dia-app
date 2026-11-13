import { addMonths, dayOfMonth, fromKey, type DateKey } from './dates';
import { cycleEnd } from './schedule';
import type { CreditCard, Loan, Payments, Service } from './types';

// Al editar la regla de fechas de un producto (día de pago, primera cuota...) los pagos ya registrados se
// mueven a las nuevas fechas. Sin esto quedarían colgados de fechas que ya no existen y los meses pagados
// volverían a salir como vencidos.

/** Mueve cada clave al día `day` de su mismo mes. Si dos caen en la misma fecha, se queda la primera. */
function sameMonth<T>(record: Record<DateKey, T>, day: number, keep?: (key: DateKey) => boolean): Record<DateKey, T> {
  const out: Record<DateKey, T> = {};
  for (const key of Object.keys(record).sort()) {
    const d = fromKey(key);
    const next = keep?.(key) ? key : dayOfMonth(d.getFullYear(), d.getMonth(), day);
    if (!(next in out)) out[next] = record[key];
  }
  return out;
}

/** Tarjeta editada: pagos al nuevo día de vencimiento y consumo del ciclo al nuevo cierre. */
export function rekeyCard(prev: CreditCard, next: CreditCard): CreditCard {
  let payments = next.payments;
  if (prev.dueDay !== next.dueDay) {
    // Un pago hecho en la fecha del estado de cuenta se queda: esa fecha la pone el banco.
    payments = sameMonth(prev.payments, next.dueDay, (k) => k === prev.statement?.dueDate);
  }
  let spendCycleEnd = next.spendCycleEnd;
  if (prev.closingDay !== next.closingDay && prev.spendCycleEnd && prev.spendCycleEnd === cycleEnd(prev)) {
    spendCycleEnd = cycleEnd(next);
  }
  return { ...next, payments, spendCycleEnd };
}

/** Servicio mensual editado: pagos e importes reales al nuevo día; el ancla conserva su mes. */
export function rekeyMonthlyService(prev: Service, day: number): Pick<Service, 'anchor' | 'payments' | 'actuals'> {
  const a = fromKey(prev.anchor);
  return {
    anchor: dayOfMonth(a.getFullYear(), a.getMonth(), day),
    payments: sameMonth(prev.payments, day),
    actuals: sameMonth(prev.actuals, day),
  };
}

/**
 * Préstamo editado: las primeras `paidCount` cuotas del nuevo calendario quedan pagadas. Se reutilizan los
 * pagos reales en orden (con su fecha e importe); solo se crean pagos nuevos para las cuotas que falten.
 */
export function rekeyLoan(prev: Payments, firstDue: DateKey, paidCount: number, installment: number): Payments {
  const real = Object.keys(prev)
    .sort()
    .map((k) => prev[k]);
  const day = fromKey(firstDue).getDate();
  const out: Payments = {};
  for (let k = 0; k < paidCount; k++) {
    const due = addMonths(firstDue, k, day);
    out[due] = real[k] ?? { paidAt: due, amount: installment };
  }
  return out;
}

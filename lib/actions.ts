import { shortDate, type DateKey } from './dates';
import { money, plain } from './format';
import { successHaptic } from './haptics';
import { promptAmount } from './prompt';
import { minPaymentInterest, serviceAmount, type DueItem } from './schedule';
import { pickOption } from './sheet';
import { findCard, findLoan, findService, markPaid, setServiceActual, unmarkPaid } from './store';
import { showToast } from './toast';

// Registro de pagos compartido por los detalles y por la pulsación larga en las listas.

function done(key: 'cards' | 'services' | 'loans', id: string, due: DateKey, amount: number, label?: string) {
  markPaid(key, id, due, amount);
  successHaptic();
  showToast(label ?? `Pagado ${money(amount)}`, 'check', { actionLabel: 'Deshacer', onAction: () => unmarkPaid(key, id, due) });
}

/** Tarjeta: elige total o mínimo; sin estado de cuenta pide el monto pagado. */
export function payCard(id: string, due: DateKey): void {
  const card = findCard(id);
  if (!card) return;
  const st = card.statement && card.statement.dueDate === due ? card.statement : null;
  const ask = () =>
    promptAmount({
      title: '¿Cuánto pagaste?',
      message: `${card.bank} •••• ${card.last4} · vence ${shortDate(due)}`,
      confirmLabel: 'Registrar pago',
      onSubmit: (amount) => done('cards', id, due, amount),
    });
  if (!st) return ask();
  const interest = minPaymentInterest(card);
  pickOption<string>({
    title: '¿Cuánto pagaste?',
    options: [
      { value: 'total', label: `El total · ${money(st.total)}`, description: 'No pagas intereses' },
      {
        value: 'min',
        label: `El mínimo · ${money(st.minimum)}`,
        description: interest !== null ? `Pagarías unos ${money(interest)} de interés` : undefined,
      },
      { value: 'other', label: 'Otro monto' },
    ],
    onPick: (v) => (v === 'other' ? ask() : done('cards', id, due, v === 'total' ? st.total : st.minimum)),
  });
}

/** Servicio: si el importe varía, confirma el monto real del recibo (prellenado con el estimado o el real). */
export function payService(id: string, due: DateKey): void {
  const s = findService(id);
  if (!s) return;
  const amount = serviceAmount(s, due);
  if (!s.variable) return done('services', id, due, amount);
  promptAmount({
    title: '¿Cuánto pagaste?',
    message: `${s.provider} · vence ${shortDate(due)}`,
    initial: plain(amount),
    confirmLabel: 'Registrar pago',
    onSubmit: (n) => {
      setServiceActual(id, due, n);
      done('services', id, due, n);
    },
  });
}

export function payLoan(id: string, due: DateKey, installmentNumber?: number): void {
  const l = findLoan(id);
  if (!l) return;
  done('loans', id, due, l.installment, installmentNumber ? `Cuota ${installmentNumber} registrada` : undefined);
}

/** Pago rápido desde una fila de lista (pulsación larga). Devuelve false si el ítem no admite pago. */
export function quickPay(item: DueItem): boolean {
  if (item.status === 'pagado') return false;
  if (item.kind === 'card') {
    payCard(item.id, item.due);
    return true;
  }
  if (item.kind === 'service') {
    payService(item.id, item.due);
    return true;
  }
  if (item.kind === 'loan') {
    payLoan(item.id, item.due);
    return true;
  }
  return false;
}

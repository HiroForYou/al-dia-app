import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Button, DAY_OPTIONS, Field, FieldRow, Header, MoneyField, Screen, SelectField, ToggleRow } from '../../components/ui';
import { askConfirm } from '../../lib/confirm';
import { todayKey } from '../../lib/dates';
import { parseAmount, plain } from '../../lib/format';
import { leaveAfterDelete, optionalNumberError, useSubmitOnce, useUnsavedGuard } from '../../lib/forms';
import { rekeyCard } from '../../lib/rekey';
import { deleteCard, findCard, newId, saveCard } from '../../lib/store';
import { showToast } from '../../lib/toast';
import { BANKS, type CreditCard } from '../../lib/types';
import { useTheme } from '../../lib/theme';

const num = (n: number | null | undefined) => (n === null || n === undefined || n === 0 ? '' : plain(n));

// Vista "Agregar tarjeta" (también sirve para editar con ?id=).
export default function CardFormScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = id ? findCard(id) : undefined;

  const [bank, setBank] = useState(existing?.bank ?? 'BCP');
  const [last4, setLast4] = useState(existing?.last4 ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [closingDay, setClosingDay] = useState(existing?.closingDay ?? 18);
  const [dueDay, setDueDay] = useState(existing?.dueDay ?? 8);
  const [tea, setTea] = useState(num(existing?.tea));
  const [minSpend, setMinSpend] = useState(num(existing?.minSpend));
  const [fee, setFee] = useState(num(existing?.membershipFee));
  const [limit, setLimit] = useState(num(existing?.creditLimit));
  const [notify, setNotify] = useState(existing?.notify ?? true);
  const [tried, setTried] = useState(false);
  const allowLeave = useUnsavedGuard(JSON.stringify([bank, last4, name, closingDay, dueDay, tea, minSpend, fee, limit, notify]));

  const last4Error = tried && !/^\d{4}$/.test(last4) ? 'Escribe los 4 últimos dígitos' : null;
  const numbers = { tea: parseAmount(tea), minSpend: parseAmount(minSpend), fee: parseAmount(fee), limit: parseAmount(limit) };
  const errors = {
    tea: tried ? optionalNumberError(tea, numbers.tea) : null,
    minSpend: tried ? optionalNumberError(minSpend, numbers.minSpend) : null,
    fee: tried ? optionalNumberError(fee, numbers.fee) : null,
    limit: tried ? optionalNumberError(limit, numbers.limit) : null,
  };

  const save = useSubmitOnce(() => {
    setTried(true);
    const invalidNumber = [
      [tea, numbers.tea],
      [minSpend, numbers.minSpend],
      [fee, numbers.fee],
      [limit, numbers.limit],
    ].some(([t, n]) => optionalNumberError(t as string, n as number | null));
    if (!/^\d{4}$/.test(last4) || invalidNumber) return false;
    const draft: CreditCard = {
      id: existing?.id ?? newId(),
      bank,
      last4,
      name: name.trim(),
      closingDay,
      dueDay,
      tea: numbers.tea,
      creditLimit: numbers.limit,
      minSpend: numbers.minSpend ?? 0,
      membershipFee: numbers.fee ?? 0,
      spent: existing?.spent ?? 0,
      spendCycleEnd: existing?.spendCycleEnd ?? null,
      statement: existing?.statement ?? null,
      notify,
      payments: existing?.payments ?? {},
      createdAt: existing?.createdAt ?? todayKey(),
    };
    // Si cambió el día de vencimiento o de cierre, los pagos y el consumo del ciclo se mueven a las nuevas fechas.
    saveCard(existing ? rekeyCard(existing, draft) : draft);
    showToast(existing ? 'Tarjeta actualizada' : 'Tarjeta guardada');
    allowLeave();
    router.back();
  });

  const remove = () =>
    askConfirm({
      title: 'Eliminar tarjeta',
      message: `Se borrará ${bank} •••• ${last4} con su historial de pagos.`,
      onConfirm: () => {
        deleteCard(existing!.id);
        showToast('Tarjeta eliminada', 'trash');
        allowLeave();
        leaveAfterDelete(router);
      },
    });

  return (
    <Screen
      keyboard
      footer={
        <>
          <Button label="Guardar tarjeta" onPress={save} />
          {existing ? <Button label="Eliminar tarjeta" variant="text" danger onPress={remove} /> : null}
        </>
      }
    >
      <Header title={existing ? 'Editar tarjeta' : 'Agregar tarjeta'} />
      <FieldRow>
        <SelectField label="Banco" value={bank} options={BANKS.map((b) => ({ value: b, label: b }))} onChange={setBank} style={{ flex: 1 }} />
        <Field
          label="Últimos 4"
          value={last4}
          onChangeText={(t) => setLast4(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          placeholder="4821"
          maxLength={4}
          error={last4Error}
          style={{ flex: 1 }}
        />
      </FieldRow>
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Visa Signature" />
      <FieldRow>
        <SelectField label="Día de cierre" value={closingDay} options={DAY_OPTIONS} onChange={setClosingDay} style={{ flex: 1 }} />
        <SelectField label="Día de vencimiento" value={dueDay} options={DAY_OPTIONS} onChange={setDueDay} style={{ flex: 1 }} />
      </FieldRow>
      <FieldRow>
        <Field label="Interés (TEA)" value={tea} onChangeText={setTea} keyboardType="decimal-pad" placeholder="72.50" suffix="%" style={{ flex: 1 }} error={errors.tea} />
        <MoneyField label="Consumo mínimo" value={minSpend} onChangeText={setMinSpend} placeholder="500" style={{ flex: 1 }} error={errors.minSpend} />
      </FieldRow>
      <FieldRow>
        <MoneyField label="Cuota de membresía" value={fee} onChangeText={setFee} placeholder="25.90" style={{ flex: 1 }} error={errors.fee} />
        <MoneyField label="Línea (opcional)" value={limit} onChangeText={setLimit} placeholder="12,000" style={{ flex: 1 }} error={errors.limit} />
      </FieldRow>
      <ToggleRow label="Avisarme antes de vencer" value={notify} onChange={setNotify} />
    </Screen>
  );
}

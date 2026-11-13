import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Button, DateField, Field, FieldRow, Header, MoneyField, Screen, SelectField, ToggleRow } from '../../components/ui';
import { askConfirm } from '../../lib/confirm';
import { addMonths, todayKey } from '../../lib/dates';
import { parseAmount, plain } from '../../lib/format';
import { leaveAfterDelete, useSubmitOnce, useUnsavedGuard } from '../../lib/forms';
import { subscriptionNextCharge } from '../../lib/schedule';
import { deleteSubscription, findSubscription, newId, saveSubscription } from '../../lib/store';
import { showToast } from '../../lib/toast';
import {
  PERIOD_LABELS,
  SUBSCRIPTION_CATEGORIES,
  type Periodicity,
  type Subscription,
  type SubscriptionCategory,
  type SubscriptionKind,
} from '../../lib/types';
import { useTheme } from '../../lib/theme';

// Vista "Agregar suscripción" (y membresía con ?kind=membresia; edita con ?id=).
export default function SubscriptionFormScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const existing = params.id ? findSubscription(params.id) : undefined;
  const kind: SubscriptionKind = existing?.kind ?? (params.kind === 'membresia' ? 'membresia' : 'suscripcion');
  const isMembership = kind === 'membresia';
  const today = todayKey();

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<SubscriptionCategory>(existing?.category ?? (isMembership ? 'gimnasio' : 'streaming'));
  const [price, setPrice] = useState(existing ? plain(existing.price) : '');
  const [periodicity, setPeriodicity] = useState<Periodicity>(existing?.periodicity ?? 'mensual');
  // En edición se muestra el próximo cobro real; el ancla solo cambia si la persona mueve la fecha.
  const [initialNext] = useState(existing ? (subscriptionNextCharge(existing, today) ?? existing.anchor) : addMonths(today, 1));
  const [next, setNext] = useState(initialNext);
  const [notify, setNotify] = useState(existing?.notify ?? true);
  const [tried, setTried] = useState(false);
  const allowLeave = useUnsavedGuard(JSON.stringify([name, category, price, periodicity, next, notify]));

  const amount = parseAmount(price);
  const nameError = tried && !name.trim() ? 'Escribe un nombre' : null;
  const priceError = tried && (amount === null || amount <= 0) ? 'Escribe el precio' : null;
  const label = isMembership ? 'membresía' : 'suscripción';

  const save = useSubmitOnce(() => {
    setTried(true);
    if (!name.trim() || amount === null || amount <= 0) return false;
    const sub: Subscription = {
      id: existing?.id ?? newId(),
      kind,
      category,
      name: name.trim(),
      price: amount,
      periodicity,
      anchor: existing && next === initialNext && existing.periodicity === periodicity ? existing.anchor : next,
      notify,
      createdAt: existing?.createdAt ?? today,
    };
    saveSubscription(sub);
    showToast(existing ? `${isMembership ? 'Membresía' : 'Suscripción'} actualizada` : `${isMembership ? 'Membresía' : 'Suscripción'} guardada`);
    allowLeave();
    router.back();
  });

  const remove = () =>
    askConfirm({
      title: `Eliminar ${label}`,
      message: `Se borrará ${existing?.name}.`,
      onConfirm: () => {
        deleteSubscription(existing!.id);
        showToast(`${isMembership ? 'Membresía' : 'Suscripción'} eliminada`, 'trash');
        allowLeave();
        leaveAfterDelete(router);
      },
    });

  return (
    <Screen
      keyboard
      footer={
        <>
          <Button label={`Guardar ${label}`} onPress={save} />
          {existing ? <Button label={`Eliminar ${label}`} variant="text" danger onPress={remove} /> : null}
        </>
      }
    >
      <Header title={`${existing ? 'Editar' : 'Agregar'} ${label}`} />
      <Field label="Nombre" value={name} onChangeText={setName} placeholder={isMembership ? 'Smart Fit' : 'Netflix'} error={nameError} />
      <SelectField
        label="Categoría"
        value={category}
        options={SUBSCRIPTION_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
        onChange={setCategory}
      />
      <FieldRow>
        <MoneyField label="Precio" value={price} onChangeText={setPrice} error={priceError} style={{ flex: 1 }} />
        <SelectField
          label="Periodicidad"
          value={periodicity}
          options={(Object.keys(PERIOD_LABELS) as Periodicity[]).map((k) => ({ value: k, label: PERIOD_LABELS[k] }))}
          onChange={setPeriodicity}
          style={{ flex: 1 }}
        />
      </FieldRow>
      <DateField label="Próximo cobro" value={next} onChange={setNext} />
      <ToggleRow label="Avisarme 1 día antes" value={notify} onChange={setNotify} />
    </Screen>
  );
}

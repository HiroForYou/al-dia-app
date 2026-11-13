import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '../../components/Icon';
import { Button, DateField, DAY_OPTIONS, Field, FieldRow, Header, MoneyField, Screen, SelectField, T, ToggleRow } from '../../components/ui';
import { askConfirm } from '../../lib/confirm';
import { dayOfMonth, fromKey, todayKey, type DateKey } from '../../lib/dates';
import { parseAmount, plain } from '../../lib/format';
import { leaveAfterDelete, useSubmitOnce, useUnsavedGuard } from '../../lib/forms';
import { rekeyMonthlyService } from '../../lib/rekey';
import { serviceOpenDue } from '../../lib/schedule';
import { deleteService, findService, newId, saveService } from '../../lib/store';
import { colors, fonts, useTheme } from '../../lib/theme';
import { showToast } from '../../lib/toast';
import { PERIOD_LABELS, SERVICE_CATEGORIES, type Periodicity, type Service, type ServiceCategory } from '../../lib/types';

const PROVIDERS: Partial<Record<ServiceCategory, string[]>> = {
  luz: ['Luz del Sur', 'Enel', 'Hidrandina', 'Seal'],
  agua: ['Sedapal', 'Sedapar', 'Sedalib'],
  gas: ['Cálidda', 'Quavii'],
  internet: ['Movistar Hogar', 'Claro Hogar', 'Win', 'Entel Hogar'],
  telefono: ['Movistar', 'Claro', 'Entel', 'Bitel'],
  cable: ['DirecTV', 'Movistar TV', 'Claro TV'],
};

/** Próxima fecha con ese día (este mes si aún no pasó, si no el siguiente). */
function nextWithDay(day: number, today: DateKey): DateKey {
  const t = fromKey(today);
  const here = dayOfMonth(t.getFullYear(), t.getMonth(), day);
  return here >= today ? here : dayOfMonth(t.getFullYear(), t.getMonth() + 1, day);
}

// Vista "Agregar servicio" (también edita con ?id=).
export default function ServiceFormScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = id ? findService(id) : undefined;
  const today = todayKey();

  const [category, setCategory] = useState<ServiceCategory>(existing?.category ?? 'luz');
  const [provider, setProvider] = useState(existing?.provider ?? '');
  const [estimate, setEstimate] = useState(existing ? plain(existing.estimate) : '');
  const [variable, setVariable] = useState(existing?.variable ?? true);
  const [dueDay, setDueDay] = useState(existing?.dueDay ?? 3);
  const [periodicity, setPeriodicity] = useState<Periodicity>(existing?.periodicity ?? 'mensual');
  // En edición se muestra el próximo recibo abierto, no el ancla original (que puede ser una fecha pasada).
  const [initialNext] = useState<DateKey>(existing ? (serviceOpenDue(existing, today) ?? existing.anchor) : nextWithDay(3, today));
  const [nextDue, setNextDue] = useState<DateKey>(initialNext);
  const [supply, setSupply] = useState(existing?.supplyNumber ?? '');
  const [notify, setNotify] = useState(existing?.notify ?? true);
  const [tried, setTried] = useState(false);
  const allowLeave = useUnsavedGuard(JSON.stringify([category, provider, estimate, variable, dueDay, periodicity, nextDue, supply, notify]));

  const amount = parseAmount(estimate);
  const providerError = tried && !provider.trim() ? 'Escribe el proveedor' : null;
  const amountError = tried && (amount === null || amount <= 0) ? 'Escribe un importe' : null;
  const suggestions = (PROVIDERS[category] ?? []).filter((p) => p !== provider);

  const save = useSubmitOnce(() => {
    setTried(true);
    if (!provider.trim() || amount === null || amount <= 0) return false;
    const monthly = periodicity === 'mensual';
    const day = monthly ? dueDay : fromKey(nextDue).getDate();
    // Fechas: si la regla no cambió se conserva todo; si cambió el día de un servicio mensual, los pagos se
    // mueven al nuevo día del mismo mes; en otros cambios el próximo vencimiento pasa a ser el ancla.
    let dates: Pick<Service, 'anchor' | 'payments' | 'actuals'>;
    if (!existing) dates = { anchor: monthly ? nextWithDay(day, today) : nextDue, payments: {}, actuals: {} };
    else if (monthly && existing.periodicity === 'mensual') dates = existing.dueDay === day ? existing : rekeyMonthlyService(existing, day);
    else if (!monthly && existing.periodicity === periodicity && nextDue === initialNext) dates = existing;
    else dates = { anchor: monthly ? nextWithDay(day, today) : nextDue, payments: existing.payments, actuals: existing.actuals };
    const service: Service = {
      id: existing?.id ?? newId(),
      category,
      provider: provider.trim(),
      estimate: amount,
      variable,
      dueDay: day,
      periodicity,
      anchor: dates.anchor,
      supplyNumber: supply.trim(),
      notify,
      actuals: dates.actuals,
      payments: dates.payments,
      createdAt: existing?.createdAt ?? today,
    };
    saveService(service);
    showToast(existing ? 'Servicio actualizado' : 'Servicio guardado');
    allowLeave();
    router.back();
  });

  const remove = () =>
    askConfirm({
      title: 'Eliminar servicio',
      message: `Se borrará ${existing?.provider} con su historial de pagos.`,
      onConfirm: () => {
        deleteService(existing!.id);
        showToast('Servicio eliminado', 'trash');
        allowLeave();
        leaveAfterDelete(router);
      },
    });

  return (
    <Screen
      keyboard
      footer={
        <>
          <Button label="Guardar servicio" onPress={save} />
          {existing ? <Button label="Eliminar servicio" variant="text" danger onPress={remove} /> : null}
        </>
      }
    >
      <Header title={existing ? 'Editar servicio' : 'Agregar servicio'} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 20, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {SERVICE_CATEGORIES.map((c) => {
          const active = c.key === category;
          return (
            <Pressable
              key={c.key}
              accessibilityRole="button"
              accessibilityLabel={c.label}
              accessibilityState={{ selected: active }}
              onPress={() => setCategory(c.key)}
              style={{ width: 70, alignItems: 'center', gap: 6 }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.primarySoft,
                  borderWidth: 2,
                  borderColor: active ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={c.icon} size={20} color={colors.primaryOnSoft} />
              </View>
              <T style={{ fontSize: 12, fontFamily: active ? fonts.sansSemi : fonts.sans }}>{c.short}</T>
            </Pressable>
          );
        })}
      </ScrollView>

      <Field label="Proveedor" value={provider} onChangeText={setProvider} placeholder={PROVIDERS[category]?.[0] ?? 'Nombre del proveedor'} error={providerError} />
      {suggestions.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {suggestions.map((p) => (
            <Pressable key={p} onPress={() => setProvider(p)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: colors.primarySoft }}>
              <T style={{ fontSize: 12, color: colors.primaryOnSoft, fontFamily: fonts.sansMedium }}>{p}</T>
            </Pressable>
          ))}
        </View>
      ) : null}
      <MoneyField label="Importe estimado" value={estimate} onChangeText={setEstimate} error={amountError} />
      <ToggleRow label="El importe cambia cada mes" value={variable} onChange={setVariable} style={{ marginTop: 14 }} />
      <FieldRow>
        {periodicity === 'mensual' ? (
          <SelectField label="Vence el día" value={dueDay} options={DAY_OPTIONS} onChange={setDueDay} style={{ flex: 1 }} />
        ) : (
          <DateField label="Próximo vencimiento" value={nextDue} onChange={setNextDue} style={{ flex: 1 }} />
        )}
        <SelectField
          label="Periodicidad"
          value={periodicity}
          options={(Object.keys(PERIOD_LABELS) as Periodicity[]).map((k) => ({ value: k, label: PERIOD_LABELS[k] }))}
          onChange={(p) => {
            setPeriodicity(p);
            if (p !== 'mensual') setNextDue(nextWithDay(dueDay, today));
          }}
          style={{ flex: 1 }}
        />
      </FieldRow>
      <Field label="Número de suministro (opcional)" value={supply} onChangeText={setSupply} placeholder="0012345" />
      <ToggleRow label="Avisarme antes de vencer" value={notify} onChange={setNotify} />
    </Screen>
  );
}

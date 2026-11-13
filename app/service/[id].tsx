import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, CircleButton, DetailRows, EmptyState, Header, IconBubble, MoneyField, Screen, StatusChip, T } from '../../components/ui';
import { longDate, shortDate } from '../../lib/dates';
import { useToday } from '../../lib/today';
import { money, parseAmount, plain } from '../../lib/format';
import { serviceItem, serviceOpenDue } from '../../lib/schedule';
import { useSettings } from '../../lib/settings';
import { payService } from '../../lib/actions';
import { setServiceActual, useData } from '../../lib/store';
import { colors, fonts, useTheme } from '../../lib/theme';
import { PERIOD_LABELS, serviceIcon } from '../../lib/types';

// Vista "Detalle de servicio": importe estimado, importe real del recibo y "Marcar como pagado".
export default function ServiceDetailScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const settings = useSettings();
  const service = data.services.find((s) => s.id === id);
  const today = useToday();
  const due = service ? serviceOpenDue(service, today) : null;
  const [actual, setActual] = useState('');

  useEffect(() => {
    if (service && due) setActual(service.actuals[due] !== undefined ? plain(service.actuals[due]) : '');
    // Solo al cambiar de recibo; mientras se escribe no se pisa el valor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.id, due]);

  if (!service) {
    return (
      <Screen>
        <Header title="Servicio" />
        <EmptyState icon="bolt" title="Servicio no encontrado" body="Puede que lo hayas eliminado." />
      </Screen>
    );
  }

  const item = due ? serviceItem(service, due, today) : null;
  const lastPaid = Object.entries(service.payments).sort(([a], [b]) => (a < b ? 1 : -1))[0];

  const saveActual = () => {
    if (!due) return;
    const n = parseAmount(actual);
    setServiceActual(service.id, due, n);
  };

  const pay = () => {
    if (!due) return;
    // Lo escrito en "Importe real" se guarda antes de abrir la confirmación del monto.
    const n = parseAmount(actual);
    if (n !== null) setServiceActual(service.id, due, n);
    payService(service.id, due);
  };

  return (
    <Screen keyboard footer={<Button label="Marcar como pagado" disabled={!due} onPress={pay} />}>
      <Header title={service.provider} right={<CircleButton icon="edit" label="Editar" onPress={() => router.push(`/service/form?id=${service.id}`)} />} />

      <View style={{ alignItems: 'center', marginTop: 26 }}>
        <IconBubble icon={serviceIcon(service.category)} size={64} iconSize={30} />
        <T style={{ fontSize: 13, color: colors.muted, marginTop: 12 }}>{service.variable ? 'Importe estimado' : 'Importe'}</T>
        <T numberOfLines={1} style={{ fontFamily: fonts.sansBold, fontSize: 36 }}>
          {money(item?.amount ?? service.estimate)}
        </T>
        {item ? <StatusChip status={item.status} /> : null}
      </View>

      {service.variable && due ? (
        <MoneyField label="Importe real de este recibo" value={actual} onChangeText={setActual} onBlur={saveActual} placeholder={plain(service.estimate)} />
      ) : null}

      <View style={{ marginTop: 12 }}>
        <DetailRows
          rows={[
            ['Vence', due ? longDate(due) : '—'],
            ['Periodicidad', PERIOD_LABELS[service.periodicity]],
            ['Recordatorio', service.notify && settings.notifications ? `${settings.remindDays} ${settings.remindDays === 1 ? 'día' : 'días'} antes` : 'Desactivado'],
            ...(service.supplyNumber ? ([['N.º de suministro', service.supplyNumber]] as [string, string][]) : []),
            ...(lastPaid ? ([['Último pago', `${money(lastPaid[1].amount)} · ${shortDate(lastPaid[1].paidAt)}`]] as [string, string][]) : []),
          ]}
        />
      </View>
    </Screen>
  );
}

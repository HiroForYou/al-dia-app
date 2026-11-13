import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, CircleButton, DetailRows, EmptyState, Header, IconBubble, Screen, StatusChip, T } from '../../components/ui';
import { longDate } from '../../lib/dates';
import { useSettings } from '../../lib/settings';
import { useToday } from '../../lib/today';
import { money } from '../../lib/format';
import { askConfirm } from '../../lib/confirm';
import { subscriptionNextCharge } from '../../lib/schedule';
import { deleteSubscription, useData } from '../../lib/store';
import { colors, fonts, useTheme } from '../../lib/theme';
import { showToast } from '../../lib/toast';
import { PERIOD_LABELS, PERIOD_MONTHS, SUBSCRIPTION_CATEGORIES, subscriptionIcon } from '../../lib/types';

// Detalle de suscripción o membresía: próximo cobro y costo al mes y al año.
export default function SubscriptionDetailScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const settings = useSettings();
  const today = useToday();
  const sub = data.subscriptions.find((s) => s.id === id);

  if (!sub) {
    return (
      <Screen>
        <Header title="Suscripción" />
        <EmptyState icon="play" title="No encontrada" body="Puede que la hayas eliminado." />
      </Screen>
    );
  }

  const next = subscriptionNextCharge(sub, today);
  const months = PERIOD_MONTHS[sub.periodicity];
  const isMembership = sub.kind === 'membresia';

  const cancel = () =>
    askConfirm({
      title: `¿Cancelaste ${sub.name}?`,
      message: 'La quitaremos de tus pagos y ya no te avisaremos de sus cobros.',
      confirmLabel: 'Quitar',
      onConfirm: () => {
        deleteSubscription(sub.id);
        showToast(`${sub.name} quitada`, 'trash');
        router.back();
      },
    });

  return (
    <Screen footer={<Button label={isMembership ? 'Quitar (ya no la tengo)' : 'Quitar (ya la cancelé)'} variant="outline" onPress={cancel} />}>
      <Header title={sub.name} right={<CircleButton icon="edit" label="Editar" onPress={() => router.push(`/subscription/form?id=${sub.id}`)} />} />
      <View style={{ alignItems: 'center', marginTop: 26 }}>
        <IconBubble icon={subscriptionIcon(sub)} size={64} iconSize={30} />
        <T style={{ fontSize: 13, color: colors.muted, marginTop: 12 }}>{PERIOD_LABELS[sub.periodicity]}</T>
        <T style={{ fontFamily: fonts.sansBold, fontSize: 36 }}>{money(sub.price)}</T>
        {next ? <StatusChip status="por_vencer" label={`Cobro ${longDate(next).slice(0, 5)}`} /> : null}
      </View>
      <View style={{ marginTop: 18 }}>
        <DetailRows
          rows={[
            ['Próximo cobro', next ? longDate(next) : '—'],
            ['Categoría', SUBSCRIPTION_CATEGORIES.find((c) => c.key === sub.category)?.label ?? 'Otro'],
            ['Equivale al mes', money(sub.price / months)],
            ['Costo al año', money((sub.price * 12) / months)],
            ['Recordatorio', sub.notify && settings.notifications ? '1 día antes' : 'Desactivado'],
          ]}
        />
      </View>
    </Screen>
  );
}

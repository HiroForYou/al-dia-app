import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Button, CircleButton, DueRow, EmptyState, RowList, Screen, SectionLabel, T, statusDot } from '../../components/ui';
import { fromKey, headerDate, monthName } from '../../lib/dates';
import { moneyShort } from '../../lib/format';
import { homeItems, itemHref } from '../../lib/schedule';
import { useSettings } from '../../lib/settings';
import { useData } from '../../lib/store';
import { colors, fonts, useTheme } from '../../lib/theme';
import { useToday } from '../../lib/today';

function SummaryTile({ label, amount, dot, onPress }: { label: string; amount: number; dot: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${moneyShort(amount)}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 12, opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot }} />
        <T numberOfLines={1} style={{ fontSize: 12, color: colors.muted }}>
          {label}
        </T>
      </View>
      <T numberOfLines={1} style={{ fontFamily: fonts.sansBold, fontSize: 15, marginTop: 6 }}>
        {moneyShort(amount)}
      </T>
    </Pressable>
  );
}

// Vista "Inicio": resumen del mes y lista de vencimientos (atrasados primero).
export default function HomeScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const data = useData();
  const { currency } = useSettings();
  const today = useToday();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { items, totals } = useMemo(() => homeItems(data, today), [data, today, currency]);
  const empty = data.cards.length + data.services.length + data.subscriptions.length + data.loans.length === 0;

  return (
    <Screen tabBar>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 12, color: colors.muted }}>{headerDate(today)}</T>
          <T style={{ fontFamily: fonts.sansBold, fontSize: 18 }}>Tus vencimientos</T>
        </View>
        <CircleButton icon="bell" label="Recordatorios" onPress={() => router.push('/reminders')} />
      </View>

      {empty ? (
        <EmptyState icon="calendar" title="Aún no tienes recordatorios" body="Agrega una tarjeta o un servicio y te avisamos antes de que venza.">
          <Button label="Agregar tarjeta" onPress={() => router.push('/card/form')} />
          <Button label="Agregar servicio" variant="outline" onPress={() => router.push('/service/form')} />
        </EmptyState>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
            <SummaryTile label="Vencidos" amount={totals.vencido} dot={statusDot('vencido')} onPress={() => router.push('/reminders')} />
            <SummaryTile label="Por vencer" amount={totals.por_vencer} dot={statusDot('por_vencer')} onPress={() => router.push('/reminders')} />
            <SummaryTile label="Pagados" amount={totals.pagado} dot={statusDot('pagado')} />
          </View>
          <SectionLabel>{monthName(fromKey(today).getMonth())}</SectionLabel>
          {items.length === 0 ? (
            <T style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>No tienes pagos este mes.</T>
          ) : (
            <RowList>
              {items.map((item) => (
                <DueRow key={item.key} item={item} onPress={() => router.push(itemHref(item) as never)} />
              ))}
            </RowList>
          )}
        </>
      )}
    </Screen>
  );
}

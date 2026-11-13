import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, CircleButton, DetailRows, EmptyState, Header, ProgressBar, Screen, StatusChip, T } from '../../components/ui';
import { dayOfMonth, fromKey, shortDate } from '../../lib/dates';
import { useToday } from '../../lib/today';
import { money, moneyShort, percent, plain } from '../../lib/format';
import { cardItem, cardOpenDue, cardTitle, exonerationInfo, minPaymentInterest } from '../../lib/schedule';
import { payCard } from '../../lib/actions';
import { useData } from '../../lib/store';
import { colors, fonts, useTheme } from '../../lib/theme';
import type { DateKey } from '../../lib/dates';

/** Cierre que generó el estado de cuenta de un vencimiento (el último cierre antes de esa fecha). */
function closingBefore(closingDay: number, due: DateKey): DateKey {
  const d = fromKey(due);
  const same = dayOfMonth(d.getFullYear(), d.getMonth(), closingDay);
  return same < due ? same : dayOfMonth(d.getFullYear(), d.getMonth() - 1, closingDay);
}

// Vista "Detalle de tarjeta": total del estado de cuenta, mínimo, intereses y exoneración.
export default function CardDetailScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const today = useToday();
  const card = data.cards.find((c) => c.id === id);

  if (!card) {
    return (
      <Screen>
        <Header title="Tarjeta" />
        <EmptyState icon="card" title="Tarjeta no encontrada" body="Puede que la hayas eliminado." />
      </Screen>
    );
  }

  const due = cardOpenDue(card, today);
  const item = due ? cardItem(card, due, today) : null;
  const statement = card.statement && due && card.statement.dueDate === due ? card.statement : null;
  const interest = statement ? minPaymentInterest(card) : null;
  const exo = exonerationInfo(card, today);

  const pay = () => {
    if (due) payCard(card.id, due);
  };

  return (
    <Screen
      footer={
        <>
          <Button label="Actualizar estado de cuenta" onPress={() => router.push(`/card/statement?id=${card.id}`)} />
          <Button label={due ? `Ya pagué (vence ${shortDate(due)})` : 'Ya pagué esta tarjeta'} variant="outline" disabled={!due} onPress={pay} />
        </>
      }
    >
      <Header
        title={`${cardTitle(card)} •••• ${card.last4}`}
        right={<CircleButton icon="edit" label="Editar" onPress={() => router.push(`/card/form?id=${card.id}`)} />}
      />

      <View style={{ marginTop: 22 }}>
        <T style={{ fontSize: 13, color: colors.muted }}>
          {due ? `Total a pagar · ${item?.status === 'vencido' ? 'venció' : 'vence'} ${shortDate(due)}` : 'Sin pagos pendientes'}
        </T>
        <T numberOfLines={1} style={{ fontFamily: fonts.sansBold, fontSize: 38, marginTop: 2 }}>
          {statement ? money(statement.total) : '-'}
        </T>
        {item ? <StatusChip status={item.status} /> : null}
        {!statement && due ? (
          <T style={{ fontSize: 13, color: colors.muted, marginTop: 8, lineHeight: 19 }}>
            Cuando cierre tu ciclo, copia el total y el mínimo desde la app de tu banco con “Actualizar estado de cuenta”.
          </T>
        ) : null}
      </View>

      <View style={{ marginTop: 14 }}>
        <DetailRows
          rows={[
            ['Pago mínimo', statement ? money(statement.minimum) : '—'],
            ['Fecha de cierre', shortDate(due ? closingBefore(card.closingDay, due) : dayOfMonth(new Date().getFullYear(), new Date().getMonth(), card.closingDay))],
            ['Interés (TEA)', card.tea !== null ? percent(card.tea) : '—'],
            ['Interés si pagas solo el mínimo', interest !== null ? money(interest) : '—'],
            ...(card.creditLimit !== null ? ([['Línea de crédito', money(card.creditLimit)]] as [string, string][]) : []),
          ]}
        />
      </View>

      {exo ? (
        <Card style={{ marginTop: 18, borderRadius: 16 }} onPress={() => router.push(`/card/statement?id=${card.id}`)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T style={{ fontSize: 14, fontFamily: fonts.sansBold }}>Exoneración de membresía</T>
            <T style={{ fontSize: 14, color: colors.muted }}>
              {moneyShort(exo.spent)} de {plain(exo.goal)}
            </T>
          </View>
          <View style={{ marginTop: 10 }}>
            <ProgressBar value={exo.progress} color={colors.success} />
          </View>
          <T style={{ fontSize: 12, color: colors.muted, marginTop: 8, lineHeight: 17 }}>
            {exo.met
              ? 'Cumpliste el consumo mínimo de este ciclo.'
              : `Faltan ${moneyShort(exo.missing)} hasta el ${shortDate(exo.until)}.${card.membershipFee ? ` Si no llegas, se cobra ${money(card.membershipFee)}.` : ''}`}
          </T>
        </Card>
      ) : null}
    </Screen>
  );
}

import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, EmptyState, ProgressBar, Screen, ScreenTitle, StatusChip, T } from '../../../components/ui';
import { shortDate } from '../../../lib/dates';
import { moneyShort } from '../../../lib/format';
import { cardTitle, exonerationInfo, type ExonerationInfo } from '../../../lib/schedule';
import { useData } from '../../../lib/store';
import { colors, fonts, useTheme } from '../../../lib/theme';

// Vista "Exoneraciones": avance del consumo mínimo de cada tarjeta para no pagar la membresía.
export default function ExonerationsScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const { cards } = useData();
  const list = cards.map((c) => exonerationInfo(c)).filter((x): x is ExonerationInfo => !!x);

  return (
    <Screen tabBar>
      <ScreenTitle title="Exoneraciones" subtitle="Consumo mínimo para no pagar membresía" />
      {list.length === 0 ? (
        <EmptyState
          icon="check"
          title="Sin metas de consumo"
          body="En cada tarjeta puedes indicar el consumo mínimo que te pide el banco para exonerarte de la membresía."
        >
          <Button label={cards.length ? 'Ir a mis tarjetas' : 'Agregar tarjeta'} onPress={() => router.push(cards.length ? '/products/cards' : '/card/form')} />
        </EmptyState>
      ) : (
        list.map((x) => (
          <Card key={x.card.id} style={{ marginTop: 12 }} onPress={() => router.push(`/card/statement?id=${x.card.id}`)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <T numberOfLines={1} style={{ flex: 1, fontFamily: fonts.sansBold, fontSize: 15 }}>
                {cardTitle(x.card)}
              </T>
              <StatusChip status={x.met ? 'pagado' : 'por_vencer'} label={x.met ? 'Cumplido' : 'Por cumplir'} />
            </View>
            <T style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>
              {moneyShort(x.spent)} de {moneyShort(x.goal)}
            </T>
            <View style={{ marginTop: 10 }}>
              <ProgressBar value={x.progress} color={x.met ? colors.success : colors.primary} />
            </View>
            <T style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>
              {x.met
                ? 'Cumplido este ciclo'
                : `Faltan ${moneyShort(x.missing)} · hasta el ${shortDate(x.until)}${x.card.membershipFee ? ` · si no, pagas ${moneyShort(x.card.membershipFee)}` : ''}`}
            </T>
          </Card>
        ))
      )}
      {list.length ? <T style={{ fontSize: 12, color: colors.muted, marginTop: 16, lineHeight: 18 }}>Toca una tarjeta para actualizar su consumo acumulado.</T> : null}
    </Screen>
  );
}

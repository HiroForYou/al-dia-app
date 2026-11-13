import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Button, EmptyState, LIST_TOOLS_MIN, ListTools, normalizeSearch, Screen, ScreenTitle, T } from '../../../components/ui';
import { shortDate } from '../../../lib/dates';
import { moneyShort } from '../../../lib/format';
import { cardOpenDue } from '../../../lib/schedule';
import { useData } from '../../../lib/store';
import { CARD_TONES, colors, fonts, isDark, radius, useTheme } from '../../../lib/theme';

type Sort = 'fecha' | 'nombre';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'fecha', label: 'Por vencimiento' },
  { key: 'nombre', label: 'Por nombre' },
];

// Vista "Mis tarjetas": cada tarjeta en un bloque verde (tonos alternados) con su próximo vencimiento.
export default function CardsScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const { cards } = useData();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('fecha');
  // El tono de cada tarjeta depende de su posición original, así no cambia al buscar u ordenar.
  const q = normalizeSearch(query);
  const shown = cards
    .map((card, tone) => ({ card, tone, due: cardOpenDue(card) }))
    .filter(({ card }) => !q || normalizeSearch(`${card.bank} ${card.name} ${card.last4}`).includes(q))
    .sort((a, b) => (sort === 'nombre' ? `${a.card.bank} ${a.card.name}`.localeCompare(`${b.card.bank} ${b.card.name}`) : (a.due ?? '9').localeCompare(b.due ?? '9')));

  return (
    <Screen tabBar>
      <ScreenTitle title="Mis tarjetas" />
      {cards.length === 0 ? (
        <EmptyState icon="card" title="Sin tarjetas" body="Registra tus tarjetas de crédito para saber cuánto y cuándo pagar.">
          <Button label="Agregar tarjeta" onPress={() => router.push('/card/form')} />
        </EmptyState>
      ) : (
        <>
          {cards.length >= LIST_TOOLS_MIN ? (
            <ListTools query={query} onQuery={setQuery} placeholder="Buscar tarjeta" sort={sort} sorts={SORTS} onSort={setSort} />
          ) : null}
          {shown.length === 0 ? <T style={{ fontSize: 14, color: colors.muted, marginTop: 20 }}>Sin resultados para “{query}”.</T> : null}
          <View style={{ gap: 12, marginTop: 20 }}>
            {shown.map(({ card, tone: i, due }) => {
              const available =
                card.creditLimit !== null
                  ? `${moneyShort(Math.max(0, card.creditLimit - (card.statement?.total ?? 0)))} disponibles`
                  : card.statement
                    ? `${moneyShort(card.statement.total)} por pagar`
                    : 'Sin estado de cuenta';
              return (
                <Pressable
                  key={card.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${card.bank} ${card.name}, terminada en ${card.last4}, ${available}${due ? `, vence ${shortDate(due)}` : ''}`}
                  onPress={() => router.push(`/card/${card.id}`)}
                  style={({ pressed }) => ({
                    backgroundColor: CARD_TONES[i % CARD_TONES.length],
                    borderRadius: radius.card,
                    // En tema oscuro los tonos más oscuros se confunden con el fondo: un borde los separa.
                    borderWidth: isDark() ? 1 : 0,
                    borderColor: colors.border,
                    paddingVertical: 18,
                    paddingHorizontal: 20,
                    minHeight: 112,
                    gap: 10,
                    justifyContent: 'space-between',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <T numberOfLines={1} style={{ flex: 1, color: '#fff', fontFamily: fonts.sansSemi, fontSize: 15 }}>
                      {card.bank} {card.name}
                    </T>
                    {due ? (
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <T style={{ color: '#fff', fontFamily: fonts.sansSemi, fontSize: 12 }}>Vence {shortDate(due)}</T>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <View>
                      <T style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>•••• {card.last4}</T>
                      <T style={{ color: '#fff', fontFamily: fonts.sansBold, fontSize: 18, marginTop: 2 }}>{available}</T>
                    </View>
                    <Icon name="chevron" size={20} color="rgba(255,255,255,0.85)" />
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Button label="Agregar tarjeta" variant="outline" compact style={{ marginTop: 14 }} onPress={() => router.push('/card/form')} />
        </>
      )}
    </Screen>
  );
}

import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { EmptyState, ProgressBar, Screen, ScreenTitle, SectionLabel, T } from '../../components/ui';
import { fromKey, monthName, monthShort } from '../../lib/dates';
import { moneyShort } from '../../lib/format';
import { CATEGORY_LABELS, monthByCategory, monthTotal, type Category } from '../../lib/schedule';
import { useSettings } from '../../lib/settings';
import { useData } from '../../lib/store';
import { colors, fonts, useTheme } from '../../lib/theme';
import { useToday } from '../../lib/today';

const BAR_MAX = 120;

// Vista "Estadísticas": total del mes, barras de los últimos 6 meses y reparto por categoría.
export default function StatsScreen() {
  useTheme(); // repinta al cambiar el tema
  const data = useData();
  useSettings();
  const today = useToday();
  const months = useMemo(() => {
    const now = fromKey(today);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { y: d.getFullYear(), m: d.getMonth(), total: monthTotal(data, d.getFullYear(), d.getMonth(), today) };
    });
  }, [data, today]);
  const [picked, setPicked] = useState(5);
  const current = months[picked];
  const max = Math.max(1, ...months.map((x) => x.total));
  const byCat = useMemo(() => monthByCategory(data, current.y, current.m, today), [data, current.y, current.m, today]);
  const sum = Object.values(byCat).reduce((a, b) => a + b, 0);
  const cats = (Object.keys(byCat) as Category[]).sort((a, b) => byCat[b] - byCat[a]);
  const empty = data.cards.length + data.services.length + data.subscriptions.length + data.loans.length === 0;

  return (
    <Screen tabBar>
      <ScreenTitle title="Estadísticas" />
      {empty ? (
        <EmptyState icon="chart" title="Sin datos todavía" body="Cuando registres tus pagos verás aquí cuánto pagas cada mes y en qué." />
      ) : (
        <>
          <T style={{ fontSize: 13, color: colors.muted, marginTop: 18 }}>Total a pagar en {monthName(current.m).toLowerCase()}</T>
          <T numberOfLines={1} style={{ fontFamily: fonts.sansBold, fontSize: 36 }}>
            {moneyShort(current.total)}
          </T>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 150, marginTop: 16 }}>
            {months.map((x, i) => (
              <Pressable
                key={`${x.y}-${x.m}`}
                accessibilityRole="button"
                accessibilityLabel={`${monthName(x.m)}: ${moneyShort(x.total)}`}
                accessibilityState={{ selected: i === picked }}
                onPress={() => setPicked(i)}
                style={{ flex: 1, alignItems: 'center', gap: 6 }}
              >
                <View
                  style={{
                    width: '100%',
                    maxWidth: 34,
                    height: Math.max(6, Math.round((x.total / max) * BAR_MAX)),
                    borderRadius: 8,
                    backgroundColor: i === picked ? colors.primary : colors.track,
                  }}
                />
                <T style={{ fontSize: 11, color: i === picked ? colors.ink : colors.muted }}>{monthShort(x.m)}</T>
              </Pressable>
            ))}
          </View>

          <SectionLabel style={{ marginTop: 22 }}>Por categoría</SectionLabel>
          {sum === 0 ? (
            <T style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>Sin pagos en este mes.</T>
          ) : (
            cats.map((c) => {
              const pct = byCat[c] / sum;
              return (
                <View key={c} style={{ marginTop: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <T style={{ fontSize: 14 }}>{CATEGORY_LABELS[c]}</T>
                    <T style={{ fontSize: 14, fontFamily: fonts.sansBold }}>
                      {Math.round(pct * 100)}%<T style={{ fontSize: 12, color: colors.muted, fontFamily: fonts.sans }}>{`  ${moneyShort(byCat[c])}`}</T>
                    </T>
                  </View>
                  <View style={{ marginTop: 6 }}>
                    <ProgressBar value={pct} />
                  </View>
                </View>
              );
            })
          )}
        </>
      )}
    </Screen>
  );
}

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Chip, DueRow, Header, RowList, Screen, SectionLabel, T } from '../components/ui';
import { addDays } from '../lib/dates';
import { exonerationItems, itemHref, itemsInRange, overdueBefore, sortForList, type Category, type DueItem } from '../lib/schedule';
import { useData } from '../lib/store';
import { colors, useTheme } from '../lib/theme';
import { useToday } from '../lib/today';

const FILTERS: { key: Category | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'tarjetas', label: 'Tarjetas' },
  { key: 'servicios', label: 'Servicios' },
  { key: 'suscripciones', label: 'Suscripciones' },
  { key: 'prestamos', label: 'Préstamos' },
];

const WEEK = 7;
const LATER = 45;

// Vista "Recordatorios": lo pendiente de esta semana (con lo atrasado) y lo que viene más adelante.
export default function RemindersScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const data = useData();
  const [filter, setFilter] = useState<Category | 'todos'>('todos');
  const today = useToday();
  const weekEnd = addDays(today, WEEK);

  const all = useMemo(
    () =>
      [...overdueBefore(data, today, today), ...itemsInRange(data, today, addDays(today, LATER), today), ...exonerationItems(data, today)].filter(
        (i) => i.status !== 'pagado',
      ),
    [data, today],
  );
  const open = all.filter((i) => filter === 'todos' || i.category === filter);

  const week = sortForList(open.filter((i) => i.due <= weekEnd));
  const later = sortForList(open.filter((i) => i.due > weekEnd));

  const section = (title: string, list: DueItem[]) =>
    list.length ? (
      <View key={title}>
        <SectionLabel>{title}</SectionLabel>
        <RowList>
          {list.map((item) => (
            <DueRow key={item.key} item={item} onPress={() => router.push(itemHref(item) as never)} />
          ))}
        </RowList>
      </View>
    ) : null;

  return (
    <Screen>
      <Header title="Recordatorios" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ScrollView>
      {week.length + later.length === 0 ? (
        <T style={{ fontSize: 14, color: colors.muted, marginTop: 24 }}>No tienes pagos pendientes en las próximas semanas.</T>
      ) : (
        <>
          {section('Esta semana', week)}
          {section('Más adelante', later)}
        </>
      )}
    </Screen>
  );
}

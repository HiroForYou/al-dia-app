import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '../../components/Icon';
import { DueRow, RowList, Screen, SectionLabel, T, statusDot } from '../../components/ui';
import { addDays, dayOfMonth, fromKey, longDate, monthEnd, monthName, monthStart, type DateKey } from '../../lib/dates';
import { itemHref, itemsInRange, overdueBefore, sortForList, type DueItem, type DueStatus } from '../../lib/schedule';
import { useData } from '../../lib/store';
import { colors, fonts, useTheme } from '../../lib/theme';
import { useToday } from '../../lib/today';

const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const STATUS_A11Y: Record<DueStatus, string> = { vencido: 'pago vencido', por_vencer: 'pago por vencer', pagado: 'pagado' };

/** El punto del día toma el estado más urgente de sus pagos. */
function dayStatus(items: DueItem[]): DueStatus | null {
  if (!items.length) return null;
  if (items.some((i) => i.status === 'vencido')) return 'vencido';
  if (items.some((i) => i.status === 'por_vencer')) return 'por_vencer';
  return 'pagado';
}

// Vista "Calendario": mes con puntos de estado por día y la lista de próximos (o del día elegido).
export default function CalendarScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const data = useData();
  const today = useToday();
  const now = fromKey(today);
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<DateKey | null>(null);

  const from = monthStart(cursor.y, cursor.m);
  const to = monthEnd(cursor.y, cursor.m);
  const { items, byDay } = useMemo(() => {
    const list = itemsInRange(data, from, to, today);
    const map = new Map<DateKey, DueItem[]>();
    for (const i of list) {
      const day = map.get(i.due);
      if (day) day.push(i);
      else map.set(i.due, [i]);
    }
    return { items: list, byDay: map };
  }, [data, from, to, today]);
  const upcoming = useMemo(
    () => sortForList([...overdueBefore(data, today, today), ...itemsInRange(data, today, addDays(today, 30), today)].filter((i) => i.status !== 'pagado')),
    [data, today],
  );

  // Lunes = 0.
  const offset = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7;
  const days = Number(to.slice(8, 10));
  const cells: (DateKey | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => dayOfMonth(cursor.y, cursor.m, i + 1))];
  while (cells.length % 7) cells.push(null);

  const move = (delta: number) => {
    setSelected(null);
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  // Sin día elegido: lo atrasado + los próximos 30 días (o lo pendiente del mes mostrado si es otro mes).
  const isCurrentMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();
  let list: DueItem[];
  let label: string;
  if (selected) {
    list = byDay.get(selected) ?? [];
    label = longDate(selected);
  } else if (isCurrentMonth) {
    list = upcoming;
    label = 'Próximos';
  } else {
    list = items.filter((i) => i.status !== 'pagado');
    label = `Pendientes de ${monthName(cursor.m).toLowerCase()}`;
  }

  return (
    <Screen tabBar>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T style={{ flex: 1, fontFamily: fonts.sansBold, fontSize: 24 }}>
          {monthName(cursor.m)}
          {cursor.y !== now.getFullYear() ? ` ${cursor.y}` : ''}
        </T>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => move(-1)} hitSlop={8} style={{ padding: 10 }}>
          <Icon name="back" size={20} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => move(1)} hitSlop={8} style={{ padding: 10 }}>
          <Icon name="chevron" size={20} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 18 }}>
        {WEEK.map((d, i) => (
          <T key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: colors.muted }}>
            {d}
          </T>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={{ width: `${100 / 7}%`, height: 44 }} />;
          const status = dayStatus(byDay.get(day) ?? []);
          const isToday = day === today;
          const isSelected = day === selected;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`${longDate(day)}${status ? `, ${STATUS_A11Y[status]}` : ''}${isToday ? ', hoy' : ''}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelected(isSelected ? null : day)}
              style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center', gap: 3 }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isToday ? colors.primary : 'transparent',
                  borderWidth: isSelected && !isToday ? 1.5 : 0,
                  borderColor: colors.primary,
                }}
              >
                <T style={{ fontSize: 14, fontFamily: isToday ? fonts.sansSemi : fonts.sansMedium, color: isToday ? colors.onPrimary : colors.ink }}>
                  {Number(day.slice(8, 10))}
                </T>
              </View>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: status ? statusDot(status) : 'transparent' }} />
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>{label}</SectionLabel>
      {list.length === 0 ? (
        <T style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>{selected ? 'No hay pagos este día.' : 'Nada pendiente. Estás al día.'}</T>
      ) : (
        <RowList>
          {list.map((item) => (
            <DueRow key={item.key} item={item} onPress={() => router.push(itemHref(item) as never)} />
          ))}
        </RowList>
      )}
    </Screen>
  );
}

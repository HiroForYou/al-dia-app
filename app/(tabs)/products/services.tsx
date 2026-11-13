import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import {
  Button,
  CircleButton,
  DueRow,
  EmptyState,
  LIST_TOOLS_MIN,
  ListRow,
  ListTools,
  normalizeSearch,
  RowList,
  Screen,
  ScreenTitle,
  T,
} from '../../../components/ui';
import { money } from '../../../lib/format';
import { serviceItem, serviceOpenDue } from '../../../lib/schedule';
import { useData } from '../../../lib/store';
import { colors, useTheme } from '../../../lib/theme';
import { useToday } from '../../../lib/today';
import { PERIOD_LABELS, SERVICE_CATEGORIES, serviceIcon } from '../../../lib/types';

type Sort = 'fecha' | 'monto' | 'nombre';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'fecha', label: 'Por fecha' },
  { key: 'monto', label: 'Por monto' },
  { key: 'nombre', label: 'Por nombre' },
];
const ORDER = { vencido: 0, por_vencer: 1, pagado: 2 } as const;

// Vista "Servicios": cada servicio con su próximo recibo abierto (o el último pagado si está al día).
export default function ServicesScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const { services } = useData();
  const today = useToday();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('fecha');

  const rows = useMemo(
    () =>
      services.map((s) => {
        const due = serviceOpenDue(s, today);
        return { s, item: due ? serviceItem(s, due, today) : null };
      }),
    [services, today],
  );
  const pending = rows.filter((r) => r.item && r.item.status !== 'pagado' && r.item.due.slice(0, 7) <= today.slice(0, 7)).length;

  const q = normalizeSearch(query);
  const shown = rows
    .filter(({ s }) => {
      if (!q) return true;
      const category = SERVICE_CATEGORIES.find((c) => c.key === s.category)?.label ?? '';
      return normalizeSearch(`${s.provider} ${category} ${s.supplyNumber}`).includes(q);
    })
    .sort((a, b) => {
      if (sort === 'nombre') return a.s.provider.localeCompare(b.s.provider);
      if (sort === 'monto') return (b.item?.amount ?? b.s.estimate) - (a.item?.amount ?? a.s.estimate);
      // Por fecha: atrasados primero; sin recibo abierto (todo pagado) al final.
      const rank = (r: (typeof rows)[number]) => (r.item ? ORDER[r.item.status] : 3);
      return rank(a) - rank(b) || (a.item?.due ?? '').localeCompare(b.item?.due ?? '') || a.s.provider.localeCompare(b.s.provider);
    });

  return (
    <Screen tabBar>
      <ScreenTitle
        title="Servicios"
        subtitle={services.length ? `${pending} ${pending === 1 ? 'pendiente' : 'pendientes'} este mes` : undefined}
        right={services.length ? <CircleButton icon="plus" label="Agregar servicio" onPress={() => router.push('/service/form')} /> : null}
      />
      {services.length === 0 ? (
        <EmptyState icon="bolt" title="Sin servicios" body="Agrega luz, agua, gas, internet o telefonía y te avisamos antes de que venzan.">
          <Button label="Agregar servicio" onPress={() => router.push('/service/form')} />
        </EmptyState>
      ) : (
        <>
          {services.length >= LIST_TOOLS_MIN ? (
            <ListTools query={query} onQuery={setQuery} placeholder="Buscar servicio" sort={sort} sorts={SORTS} onSort={setSort} />
          ) : null}
          {shown.length === 0 ? (
            <T style={{ fontSize: 14, color: colors.muted, marginTop: 20 }}>Sin resultados para “{query}”.</T>
          ) : (
            <RowList>
              {shown.map(({ s, item }) =>
                item ? (
                  <DueRow
                    key={s.id}
                    item={{
                      ...item,
                      subtitle: `${PERIOD_LABELS[s.periodicity]} · ${item.status === 'vencido' ? 'Venció' : 'Vence'}: ${item.due.slice(8, 10)}/${item.due.slice(5, 7)}`,
                    }}
                    onPress={() => router.push(`/service/${s.id}`)}
                  />
                ) : (
                  <ListRow
                    key={s.id}
                    icon={serviceIcon(s.category)}
                    title={s.provider}
                    subtitle={PERIOD_LABELS[s.periodicity]}
                    amount={money(s.estimate)}
                    onPress={() => router.push(`/service/${s.id}`)}
                  />
                ),
              )}
            </RowList>
          )}
        </>
      )}
    </Screen>
  );
}

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Button, CircleButton, EmptyState, LIST_TOOLS_MIN, ListRow, ListTools, normalizeSearch, RowList, Screen, ScreenTitle, T } from '../../../components/ui';
import { shortDate } from '../../../lib/dates';
import { useToday } from '../../../lib/today';
import { money, moneyShort } from '../../../lib/format';
import { subscriptionNextCharge } from '../../../lib/schedule';
import { useData } from '../../../lib/store';
import { PERIOD_LABELS, PERIOD_MONTHS, subscriptionIcon, type SubscriptionKind } from '../../../lib/types';
import { colors, useTheme } from '../../../lib/theme';

type Sort = 'fecha' | 'precio' | 'nombre';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'fecha', label: 'Próximo cobro' },
  { key: 'precio', label: 'Por precio' },
  { key: 'nombre', label: 'Por nombre' },
];

// Vista "Suscripciones" (y "Membresías" con ?kind=membresia): costo mensual equivalente y próximos cobros.
export default function SubscriptionsScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind: SubscriptionKind = params.kind === 'membresia' ? 'membresia' : 'suscripcion';
  const { subscriptions } = useData();
  const today = useToday();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('fecha');
  const list = subscriptions
    .filter((s) => s.kind === kind)
    .map((s) => ({ s, next: subscriptionNextCharge(s, today) }))
    .sort((a, b) => ((a.next ?? '9') < (b.next ?? '9') ? -1 : 1));
  // Solo los cobros mensuales suman al total del mes (como en el diseño); los demás se prorratean.
  const monthly = list.reduce((acc, { s }) => acc + s.price / PERIOD_MONTHS[s.periodicity], 0);
  const isMembership = kind === 'membresia';
  const title = isMembership ? 'Membresías' : 'Suscripciones';
  const formHref = `/subscription/form?kind=${kind}`;
  const q = normalizeSearch(query);
  const shown = list
    .filter(({ s }) => !q || normalizeSearch(s.name).includes(q))
    .sort((a, b) =>
      sort === 'nombre'
        ? a.s.name.localeCompare(b.s.name)
        : sort === 'precio'
          ? b.s.price / PERIOD_MONTHS[b.s.periodicity] - a.s.price / PERIOD_MONTHS[a.s.periodicity]
          : (a.next ?? '9').localeCompare(b.next ?? '9'),
    );

  return (
    <Screen tabBar>
      <ScreenTitle
        title={title}
        subtitle={list.length ? `${moneyShort(monthly)} al mes` : undefined}
        right={list.length ? <CircleButton icon="plus" label={`Agregar ${isMembership ? 'membresía' : 'suscripción'}`} onPress={() => router.push(formHref as never)} /> : null}
      />
      {list.length === 0 ? (
        <EmptyState
          icon={isMembership ? 'star' : 'play'}
          title={isMembership ? 'Sin membresías' : 'Sin suscripciones'}
          body={
            isMembership
              ? 'Registra el gimnasio, clubes o programas que pagas con cuota fija.'
              : 'Registra Netflix, Spotify o el software que pagas y te avisamos un día antes del cobro.'
          }
        >
          <Button label={isMembership ? 'Agregar membresía' : 'Agregar suscripción'} onPress={() => router.push(formHref as never)} />
        </EmptyState>
      ) : (
        <>
          {list.length >= LIST_TOOLS_MIN ? (
            <ListTools query={query} onQuery={setQuery} placeholder={`Buscar ${isMembership ? 'membresía' : 'suscripción'}`} sort={sort} sorts={SORTS} onSort={setSort} />
          ) : null}
          {shown.length === 0 ? (
            <T style={{ fontSize: 14, color: colors.muted, marginTop: 20 }}>Sin resultados para “{query}”.</T>
          ) : (
        <RowList>
          {shown.map(({ s, next }) => (
            <ListRow
              key={s.id}
              icon={subscriptionIcon(s)}
              title={s.name}
              subtitle={`${PERIOD_LABELS[s.periodicity]}${next ? ` · Cobro: ${shortDate(next)}` : ''}`}
              amount={money(s.price)}
              onPress={() => router.push(`/subscription/${s.id}`)}
            />
          ))}
        </RowList>
          )}
        </>
      )}
    </Screen>
  );
}

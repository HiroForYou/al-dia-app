import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Widget "Próximos vencimientos" (4×2): cabecera verde con el total pendiente del mes y hasta tres pagos
// abiertos con su estado. Al tocarlo se abre la app.

export const WIDGET_NAME = 'Upcoming';

export interface WidgetRow {
  title: string;
  when: string;
  amount: string;
  tone: 'danger' | 'warn' | 'ok';
}

export interface UpcomingProps {
  pending: string;
  rows: WidgetRow[];
  locked: boolean;
}

type Hex = `#${string}`;
const PRIMARY: Hex = '#0E5E63';
const SOFT: Hex = '#CFE6E6';

// Paletas clara y oscura (Android elige según el tema del sistema).
const PALETTES = {
  light: { bg: '#F7F7F8' as Hex, ink: '#1C1C1E' as Hex, muted: '#6B6B76' as Hex, tone: { danger: '#C62828', warn: '#9A5B00', ok: '#22A06B' } as Record<WidgetRow['tone'], Hex> },
  dark: { bg: '#1A2122' as Hex, ink: '#F2F3F4' as Hex, muted: '#9CA6A8' as Hex, tone: { danger: '#FF8A80', warn: '#F5C26B', ok: '#2FB57C' } as Record<WidgetRow['tone'], Hex> },
};
type WidgetPalette = (typeof PALETTES)['light'];

function Row({ row, p }: { row: WidgetRow; p: WidgetPalette }) {
  const { ink: INK, muted: MUTED, tone: TONE } = p;
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', paddingVertical: 6 }}>
      <FlexWidget style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TONE[row.tone], marginRight: 10 }} />
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget text={row.title} maxLines={1} truncate="END" style={{ fontSize: 14, fontWeight: '600', color: INK }} />
        <TextWidget text={row.when} maxLines={1} style={{ fontSize: 11, color: MUTED }} />
      </FlexWidget>
      <TextWidget text={row.amount} style={{ fontSize: 14, fontWeight: '700', color: INK, marginLeft: 8 }} />
    </FlexWidget>
  );
}

export function UpcomingWidget({ pending, rows, locked, dark = false }: UpcomingProps & { dark?: boolean }) {
  const p = dark ? PALETTES.dark : PALETTES.light;
  const { bg: BG, muted: MUTED } = p;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'column', borderRadius: 24, backgroundColor: BG, overflow: 'hidden' }}
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: PRIMARY,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <TextWidget text="Al Día" style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }} />
        <TextWidget text={locked ? 'Protegido' : `Por pagar ${pending}`} style={{ fontSize: 12, color: SOFT }} />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, width: 'match_parent', flexDirection: 'column', paddingHorizontal: 16, paddingVertical: 6 }}>
        {locked ? (
          <TextWidget text="Abre la app para ver tus vencimientos" style={{ fontSize: 13, color: MUTED, marginTop: 8 }} />
        ) : rows.length === 0 ? (
          <TextWidget text="Estás al día. No hay pagos pendientes." style={{ fontSize: 13, color: MUTED, marginTop: 8 }} />
        ) : (
          rows.map((row, i) => <Row key={i} row={row} p={p} />)
        )}
      </FlexWidget>
    </FlexWidget>
  );
}

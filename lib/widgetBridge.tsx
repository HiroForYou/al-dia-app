import { Platform, TurboModuleRegistry } from 'react-native';

import { shortDate, todayKey } from './dates';
import { moneyShort } from './format';
import { homeItems } from './schedule';
import { getSettings } from './settings';
import type { AppData } from './types';
import type { UpcomingProps } from '../widget/UpcomingWidget';

// Puente entre los datos y el widget de pantalla de inicio. El código del widget solo se carga si el
// módulo nativo existe (builds del dev client que lo incluyan).

export function isWidgetSupported(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return !!TurboModuleRegistry.get('AndroidWidget');
  } catch {
    return false;
  }
}

/** Contenido del widget: pagos abiertos (atrasados primero) y total pendiente del mes. */
export function widgetProps(data: AppData): UpcomingProps {
  const today = todayKey();
  // Con bloqueo activo el widget no muestra montos ni nombres.
  if (getSettings().lock) return { pending: '', rows: [], locked: true };
  const { items, totals } = homeItems(data, today);
  const open = items.filter((i) => i.status !== 'pagado' && i.kind !== 'exoneration').slice(0, 3);
  return {
    locked: false,
    pending: moneyShort(totals.vencido + totals.por_vencer),
    rows: open.map((i) => ({
      title: i.title,
      when: `${i.status === 'vencido' ? 'Venció' : 'Vence'}: ${shortDate(i.due)}`,
      amount: i.amount !== null ? moneyShort(i.amount) : '—',
      tone: i.status === 'vencido' ? 'danger' : 'warn',
    })),
  };
}

export async function refreshWidget(data: AppData): Promise<void> {
  if (!isWidgetSupported()) return;
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    const { UpcomingWidget, WIDGET_NAME } = require('../widget/UpcomingWidget') as typeof import('../widget/UpcomingWidget');
    const props = widgetProps(data);
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => ({ light: <UpcomingWidget {...props} />, dark: <UpcomingWidget {...props} dark /> }),
    });
  } catch {
    // El widget es opcional: un fallo aquí no afecta la app.
  }
}

import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { widgetProps } from '../lib/widgetBridge';
import { getData, isDataLoaded, loadData } from '../lib/store';
import { getSettings, loadSettings } from '../lib/settings';
import { UpcomingWidget } from './UpcomingWidget';

// Tarea en segundo plano del widget: puede correr con la app cerrada, así que carga los datos si hace falta.
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  if (!getSettings().loaded) await loadSettings();
  if (!isDataLoaded()) await loadData();
  const data = widgetProps(getData());
  props.renderWidget({ light: <UpcomingWidget {...data} />, dark: <UpcomingWidget {...data} dark /> });
}

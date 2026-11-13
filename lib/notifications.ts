import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays, fromKey, todayKey, type DateKey } from './dates';
import { money, moneyShort } from './format';
import { exonerationInfo, itemHref, itemsInRange, type DueItem } from './schedule';
import { getSettings } from './settings';
import type { AppData } from './types';

// Avisos locales de vencimiento. Cada vez que cambian los datos o los ajustes se cancelan todos y se
// vuelven a programar los de los próximos 60 días (Android limita las alarmas, por eso el tope).

const CHANNEL = 'vencimientos';
const HORIZON_DAYS = 60;
const MAX_SCHEDULED = 60;
const HOUR = 9;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let channelReady = false;

async function ensureChannel() {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Vencimientos',
    description: 'Avisos antes de que venzan tus pagos',
    importance: Notifications.AndroidImportance.HIGH,
  });
  channelReady = true;
}

/** Pide permiso si aún no se ha dado. Devuelve true si se pueden mostrar avisos. */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

function at(key: DateKey, hour = HOUR): Date {
  const d = fromKey(key);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function bodyFor(item: DueItem, daysBefore: number): string {
  const amount = item.amount !== null ? ` · ${money(item.amount)}` : '';
  if (daysBefore === 0) return `Vence hoy${amount}`;
  if (item.kind === 'subscription') return `Se cobra ${daysBefore === 1 ? 'mañana' : `en ${daysBefore} días`}${amount}`;
  return `Vence ${daysBefore === 1 ? 'mañana' : `en ${daysBefore} días`}${amount}`;
}

interface Planned {
  date: Date;
  title: string;
  body: string;
  href: string;
}

function plan(data: AppData, now: Date): Planned[] {
  const settings = getSettings();
  const today = todayKey();
  const out: Planned[] = [];
  const items = itemsInRange(data, today, addDays(today, HORIZON_DAYS), today).filter((i) => i.status === 'por_vencer' && i.notify);
  for (const item of items) {
    const days = item.kind === 'subscription' ? 1 : settings.remindDays;
    const before = at(addDays(item.due, -days));
    if (before > now) out.push({ date: before, title: item.title, body: bodyFor(item, days), href: itemHref(item) });
    // Tarjetas, servicios y préstamos: también el mismo día.
    if (item.kind !== 'subscription') {
      const sameDay = at(item.due);
      if (sameDay > now) out.push({ date: sameDay, title: item.title, body: bodyFor(item, 0), href: itemHref(item) });
    }
  }
  for (const card of data.cards) {
    const info = exonerationInfo(card, today);
    if (!info || info.met || !card.notify) continue;
    const when = at(addDays(info.until, -settings.remindDays));
    if (when > now) {
      out.push({
        date: when,
        title: `Exoneración ${card.bank}`,
        body: `Te faltan ${moneyShort(info.missing)} de consumo para no pagar la membresía`,
        href: `/card/statement?id=${card.id}`,
      });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_SCHEDULED);
}

let running: Promise<void> | null = null;
let latest: AppData | null = null;
/** Firma del último plan programado: si no cambia, no se toca nada (evita cancelar y recrear 60 alarmas). */
let lastSignature = '';

/** Reprograma todos los avisos. Si ya hay una pasada en curso, se repite al terminar con los datos más recientes. */
export function rescheduleNotifications(data: AppData): Promise<void> {
  latest = data;
  if (running) return running;
  running = (async () => {
    try {
      while (latest) {
        const current = latest;
        latest = null;
        const perm = await Notifications.getPermissionsAsync();
        const enabled = getSettings().notifications && perm.granted;
        const planned = enabled ? plan(current, new Date()) : [];
        const signature = JSON.stringify(planned.map((p) => [p.date.getTime(), p.title, p.body, p.href]));
        if (signature === lastSignature) continue;
        await Notifications.cancelAllScheduledNotificationsAsync();
        if (enabled) await ensureChannel();
        for (const p of planned) {
          await Notifications.scheduleNotificationAsync({
            content: { title: p.title, body: p.body, data: { href: p.href } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.date, channelId: CHANNEL },
          });
        }
        lastSignature = signature;
      }
    } catch {
      // Sin módulo nativo o sin permiso: la app sigue sin avisos.
      lastSignature = '';
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Ruta a abrir cuando la persona toca un aviso. */
export function hrefFromResponse(response: Notifications.NotificationResponse | null): string | null {
  const href = response?.notification.request.content.data?.href;
  return typeof href === 'string' ? href : null;
}

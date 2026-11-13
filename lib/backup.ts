import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { todayKey } from './dates';
import { withoutRelock } from './security';
import { getSettings, REMIND_OPTIONS, updateSettings, type Settings } from './settings';
import { getData, normalizeData, replaceData } from './store';
import type { AppData } from './types';

// Copia de seguridad manual: un JSON con los datos y las preferencias (sin el PIN, que no sale del equipo).

interface BackupFile {
  app: 'al-dia';
  version: 1;
  exportedAt: string;
  data: AppData;
  settings: Pick<Settings, 'currency' | 'theme' | 'notifications' | 'remindDays'>;
}

export async function exportBackup(): Promise<void> {
  const s = getSettings();
  const payload: BackupFile = {
    app: 'al-dia',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: getData(),
    settings: { currency: s.currency, theme: s.theme, notifications: s.notifications, remindDays: s.remindDays },
  };
  const file = new File(Paths.cache, `al-dia-copia-${todayKey()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(payload, null, 2));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartir no está disponible en este equipo.');
  await withoutRelock(() =>
    Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Guardar copia de Al Día', UTI: 'public.json' }),
  );
}

export interface PendingImport {
  data: AppData;
  settings?: BackupFile['settings'];
  counts: { cards: number; services: number; subscriptions: number; loans: number };
}

/** Solo se importan preferencias conocidas y con valores válidos (nunca el bloqueo ni estados internos). */
function cleanSettings(raw: unknown): BackupFile['settings'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const out: Partial<BackupFile['settings']> = {};
  if (r.currency === 'PEN' || r.currency === 'USD') out.currency = r.currency;
  if (r.theme === 'light' || r.theme === 'dark' || r.theme === 'system') out.theme = r.theme;
  if (typeof r.notifications === 'boolean') out.notifications = r.notifications;
  if (typeof r.remindDays === 'number' && REMIND_OPTIONS.includes(r.remindDays)) out.remindDays = r.remindDays;
  return out as BackupFile['settings'];
}

/** Abre el selector de archivos y valida la copia. Devuelve null si la persona cancela. */
export async function pickBackup(): Promise<PendingImport | null> {
  const result = await withoutRelock(() =>
    DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true }),
  );
  if (result.canceled || !result.assets?.[0]) return null;
  const text = await new File(result.assets[0].uri).text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es una copia válida.');
  }
  const wrapper = parsed as Partial<BackupFile>;
  const data = normalizeData(wrapper.app === 'al-dia' ? wrapper.data : parsed);
  if (!data) throw new Error('El archivo no es una copia de Al Día.');
  return {
    data,
    settings: cleanSettings(wrapper.settings),
    counts: { cards: data.cards.length, services: data.services.length, subscriptions: data.subscriptions.length, loans: data.loans.length },
  };
}

export function applyImport(pending: PendingImport): void {
  replaceData(pending.data);
  if (pending.settings) updateSettings(pending.settings);
}

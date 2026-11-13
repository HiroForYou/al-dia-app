import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { Logo } from '../../components/Logo';
import { Screen, ScreenTitle, SectionLabel, SettingsRow, T } from '../../components/ui';
import { applyImport, exportBackup, pickBackup } from '../../lib/backup';
import { askConfirm } from '../../lib/confirm';
import { requestNotificationPermission } from '../../lib/notifications';
import { biometricsAvailable } from '../../lib/security';
import { CURRENCY_LABELS, REMIND_OPTIONS, THEME_LABELS, updateSettings, useSettings, type Currency, type ThemeMode } from '../../lib/settings';
import { pickOption } from '../../lib/sheet';
import { colors, fonts, useTheme } from '../../lib/theme';
import { showToast } from '../../lib/toast';

const days = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;

// Vista "Ajustes": preferencias, avisos, seguridad y copia de seguridad.
export default function SettingsScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const s = useSettings();
  const [canBio, setCanBio] = useState(false);

  useEffect(() => {
    biometricsAvailable().then(setCanBio);
  }, []);

  const toggleNotifications = async (on: boolean) => {
    if (!on) return updateSettings({ notifications: false });
    const ok = await requestNotificationPermission();
    if (ok) {
      updateSettings({ notifications: true });
      showToast('Avisos activados', 'bell');
    } else {
      askConfirm({
        title: 'Permiso necesario',
        message: 'Para recibir avisos, permite las notificaciones de Al Día en los ajustes del celular.',
        confirmLabel: 'Abrir ajustes',
        destructive: false,
        onConfirm: () => Linking.openSettings(),
      });
    }
  };

  const doExport = async () => {
    try {
      await exportBackup();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo exportar la copia', 'info');
    }
  };

  const doImport = async () => {
    try {
      const pending = await pickBackup();
      if (!pending) return;
      const c = pending.counts;
      askConfirm({
        title: 'Importar copia',
        message: `Se reemplazarán tus datos actuales por los de la copia: ${c.cards} tarjetas, ${c.services} servicios, ${c.subscriptions} suscripciones y ${c.loans} préstamos.`,
        confirmLabel: 'Importar',
        onConfirm: () => {
          applyImport(pending);
          showToast('Copia importada');
        },
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo leer la copia', 'info');
    }
  };

  return (
    <Screen tabBar>
      <ScreenTitle title="Ajustes" subtitle="Tus datos se guardan solo en este celular" />

      <SectionLabel style={{ marginTop: 22 }}>Preferencias</SectionLabel>
      <SettingsRow
        icon="coin"
        label="Moneda"
        value={CURRENCY_LABELS[s.currency]}
        onPress={() =>
          pickOption<Currency>({
            title: 'Moneda',
            selected: s.currency,
            options: (Object.keys(CURRENCY_LABELS) as Currency[]).map((k) => ({ value: k, label: CURRENCY_LABELS[k] })),
            onPick: (currency) => updateSettings({ currency }),
          })
        }
      />
      <SettingsRow
        icon="moon"
        label="Tema"
        value={THEME_LABELS[s.theme]}
        onPress={() =>
          pickOption<ThemeMode>({
            title: 'Tema',
            selected: s.theme,
            options: (Object.keys(THEME_LABELS) as ThemeMode[]).map((k) => ({ value: k, label: THEME_LABELS[k] })),
            onPick: (theme) => updateSettings({ theme }),
          })
        }
      />

      <SectionLabel style={{ marginTop: 22 }}>Avisos</SectionLabel>
      <SettingsRow icon="bell" label="Notificaciones" toggle={{ value: s.notifications, onChange: toggleNotifications }} />
      <SettingsRow
        icon="calendar"
        label="Avisar con"
        value={days(s.remindDays)}
        onPress={() =>
          pickOption<number>({
            title: 'Avisar con anticipación',
            selected: s.remindDays,
            options: REMIND_OPTIONS.map((n) => ({ value: n, label: `${days(n)} antes` })),
            onPick: (remindDays) => updateSettings({ remindDays }),
          })
        }
      />

      <SectionLabel style={{ marginTop: 22 }}>Seguridad</SectionLabel>
      <SettingsRow
        icon="lock"
        label="PIN o huella"
        toggle={{ value: s.lock, onChange: (on) => router.push(on ? '/pin?mode=create' : '/pin?mode=disable') }}
      />
      {s.lock && canBio ? (
        <SettingsRow icon="fingerprint" label="Desbloquear con huella" toggle={{ value: s.biometrics, onChange: (biometrics) => updateSettings({ biometrics }) }} />
      ) : null}
      {s.lock ? <SettingsRow icon="edit" label="Cambiar PIN" onPress={() => router.push('/pin?mode=change')} /> : null}
      <SettingsRow
        icon="shield"
        label="Ocultar en apps recientes"
        toggle={{
          value: s.hideInRecents,
          onChange: (hideInRecents) => {
            updateSettings({ hideInRecents });
            if (hideInRecents && Platform.OS === 'android') showToast('También se bloquean las capturas de pantalla', 'shield');
          },
        }}
      />

      <SectionLabel style={{ marginTop: 22 }}>Copia de seguridad</SectionLabel>
      <SettingsRow icon="download" label="Exportar copia" onPress={doExport} />
      <SettingsRow icon="upload" label="Importar copia" onPress={doImport} />

      <View style={{ alignItems: 'center', marginTop: 32, gap: 8 }}>
        <Logo size={40} ring={colors.bg} />
        <T style={{ fontFamily: fonts.sansSemi, fontSize: 13 }}>Al Día</T>
        <T style={{ fontSize: 12, color: colors.muted }}>Versión {Constants.expoConfig?.version ?? '1.0.0'}</T>
      </View>
    </Screen>
  );
}

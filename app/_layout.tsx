import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { Stack, useRouter, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Appearance, AppState, Platform, Pressable, Text, useColorScheme, View } from 'react-native';

import { BootScreen } from '../components/BootScreen';
import { ConfirmHost, OptionSheetHost, PromptHost, ToastHost } from '../components/Hosts';
import { LockScreen } from '../components/LockScreen';
import { Welcome } from '../components/Welcome';
import { hrefFromResponse, requestNotificationPermission, rescheduleNotifications } from '../lib/notifications';
import { lockNow, startLockWatcher, useLocked } from '../lib/security';
import { getSettings, loadSettings, useSettings } from '../lib/settings';
import { DATA_KEY, getData, loadData, subscribeData } from '../lib/store';
import { applyTheme, colors, notifyTheme } from '../lib/theme';
import { subscribeToday } from '../lib/today';
import { refreshWidget } from '../lib/widgetBridge';

const SPLASH_BG = '#0E5E63';

/** Pantalla de error: si algo falla al pintar, se ofrece reintentar o restaurar los datos (copiándolos antes). */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const reset = async () => {
    try {
      const raw = await AsyncStorage.getItem(DATA_KEY);
      if (raw) await AsyncStorage.setItem(`${DATA_KEY}.backup-${Date.now()}`, raw);
      await AsyncStorage.removeItem(DATA_KEY);
    } finally {
      retry();
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F8', padding: 24, justifyContent: 'center', gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#1C1C1E' }}>Algo salió mal</Text>
      <Text style={{ fontSize: 14, color: '#6B6B76' }}>{error.message}</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={{ minHeight: 52, borderRadius: 16, backgroundColor: SPLASH_BG, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Reintentar</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={reset} style={{ minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: SPLASH_BG, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#1C1C1E', fontWeight: '600', fontSize: 16 }}>Empezar sin datos (se guarda una copia)</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const router = useRouter();
  const settings = useSettings();
  const locked = useLocked();
  const scheme = useColorScheme();
  const [dataReady, setDataReady] = useState(false);
  const [welcome, setWelcome] = useState<{ intro: boolean } | null>(null);
  // La navegación solo se monta cuando ya se decidió el bloqueo: así nunca se ve contenido antes del PIN.
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    loadSettings();
    loadData().then(() => setDataReady(true));
    return startLockWatcher();
  }, []);

  const ready = (fontsLoaded || !!fontError) && settings.loaded && dataReady;

  useEffect(() => {
    if (!ready || booted) return;
    if (getSettings().lock) lockNow();
    setWelcome({ intro: !getSettings().introSeen });
    setBooted(true);
  }, [ready, booted]);

  // ---- Tema ----
  // La paleta se copia antes de pintar; luego se avisa a las pantallas (useTheme) para que se repinten sin
  // volver a montar la navegación: la persona sigue en la misma pantalla y con el mismo historial.
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && scheme === 'dark');
  applyTheme(dark);
  useLayoutEffect(() => {
    notifyTheme();
  }, [dark]);

  useEffect(() => {
    // Selectores nativos (fecha) y diálogos del sistema siguen el tema elegido en la app.
    Appearance.setColorScheme(settings.theme === 'system' ? null : settings.theme);
    if (Platform.OS === 'android' && requireOptionalNativeModule('ExpoNavigationBar')) {
      const NavigationBar = require('expo-navigation-bar') as typeof import('expo-navigation-bar');
      NavigationBar.setButtonStyleAsync(dark ? 'light' : 'dark').catch(() => {});
    }
  }, [settings.theme, dark]);

  // ---- Privacidad en apps recientes ----
  useEffect(() => {
    if (!requireOptionalNativeModule('ExpoScreenCapture')) return;
    const ScreenCapture = require('expo-screen-capture') as typeof import('expo-screen-capture');
    const run = async () => {
      if (settings.hideInRecents) {
        await ScreenCapture.preventScreenCaptureAsync('aldia-privacy');
        if (Platform.OS === 'ios') await ScreenCapture.enableAppSwitcherProtectionAsync(0.9);
      } else {
        await ScreenCapture.allowScreenCaptureAsync('aldia-privacy');
        if (Platform.OS === 'ios') await ScreenCapture.disableAppSwitcherProtectionAsync();
      }
    };
    run().catch(() => {});
  }, [settings.hideInRecents]);

  // ---- Avisos y widget ----
  // Se recalculan cuando cambian los datos, los ajustes que los afectan o el día, con un respiro para agrupar
  // varios cambios seguidos.
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const current = getData();
      rescheduleNotifications(current);
      refreshWidget(current);
    }, 800);
  }, []);

  useEffect(() => {
    if (ready) scheduleSync();
  }, [ready, settings.notifications, settings.remindDays, settings.currency, settings.lock, scheduleSync]);

  useEffect(() => {
    const offData = subscribeData(scheduleSync);
    const offToday = subscribeToday(scheduleSync);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && getSettings().loaded) scheduleSync();
    });
    return () => {
      offData();
      offToday();
      sub.remove();
    };
  }, [scheduleSync]);

  // ---- Tocar un aviso abre el detalle del pago (una sola vez por aviso) ----
  const handled = useRef(new Set<string>());
  const openFromNotification = useCallback(
    (response: Notifications.NotificationResponse | null) => {
      const href = hrefFromResponse(response);
      const id = response?.notification.request.identifier;
      if (!href || !id || handled.current.has(id)) return;
      handled.current.add(id);
      router.push(href as never);
      Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
    },
    [router],
  );

  useEffect(() => {
    if (!booted) return;
    Notifications.getLastNotificationResponseAsync().then(openFromNotification).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    return () => sub.remove();
  }, [booted, openFromNotification]);

  // Al cerrar la bienvenida se pide el permiso de avisos (la primera vez el sistema muestra el diálogo).
  const closeWelcome = useCallback(() => {
    setWelcome(null);
    if (getSettings().notifications) requestNotificationPermission().then((ok) => ok && scheduleSync());
  }, [scheduleSync]);

  const screenOptions = useMemo(
    () => ({ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' as const }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dark],
  );

  // Mismo color que la splash nativa para que el arranque sea continuo.
  if (!ready || !booted) return <BootScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={welcome || dark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }} importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={locked}>
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="pin" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </View>
      <ToastHost bottom={110} />
      <OptionSheetHost />
      <ConfirmHost />
      <PromptHost />
      {locked && !welcome ? <LockScreen /> : null}
      {welcome ? <Welcome intro={welcome.intro} onDone={closeWelcome} /> : null}
    </View>
  );
}

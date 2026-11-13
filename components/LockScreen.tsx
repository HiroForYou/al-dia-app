import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authenticateBiometric, biometricsAvailable, PIN_LENGTH, pinFailMessage, pinWaitMs, unlock, verifyPin } from '../lib/security';
import { useSettings } from '../lib/settings';
import { colors, useTheme } from '../lib/theme';
import { PinPad } from './PinPad';

/** Cuenta regresiva de la espera tras demasiados intentos; devuelve los segundos restantes. */
export function usePinWait(): [number, (ms: number) => void] {
  const [until, setUntil] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    pinWaitMs().then((ms) => ms > 0 && setUntil(Date.now() + ms));
  }, []);
  useEffect(() => {
    if (until <= Date.now()) return;
    const t = setInterval(() => {
      tick((n) => n + 1);
      if (Date.now() >= until) setUntil(0);
    }, 1000);
    return () => clearInterval(t);
  }, [until]);
  const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
  return [left, (ms: number) => setUntil(Date.now() + ms)];
}

// Pantalla de bloqueo: cubre toda la app hasta que se ingresa el PIN o se valida la huella.
// Tras 5 intentos fallidos el teclado se bloquea con esperas crecientes (30 s, 60 s, 120 s...).
export function LockScreen() {
  useTheme(); // repinta al cambiar el tema
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [canBio, setCanBio] = useState(false);
  const [waitLeft, startWait] = usePinWait();

  const tryBiometric = useCallback(async () => {
    if (await authenticateBiometric()) unlock();
  }, []);

  useEffect(() => {
    if (!settings.biometrics) return;
    biometricsAvailable().then((ok) => {
      setCanBio(ok);
      if (ok) tryBiometric();
    });
  }, [settings.biometrics, tryBiometric]);

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    verifyPin(pin).then((check) => {
      if (check.ok) return unlock();
      if (check.waitMs > 0) startWait(check.waitMs);
      setError(pinFailMessage(check));
      setPin('');
    });
  }, [pin, startWait]);

  return (
    <View
      accessibilityViewIsModal
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: insets.top + 28 }}
    >
      <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
        <PinPad
          title="Ingresa tu PIN"
          subtitle="Tus datos están protegidos en este celular"
          value={pin}
          onChange={(v) => {
            setError(null);
            setPin(v);
          }}
          error={waitLeft > 0 ? `Demasiados intentos. Espera ${waitLeft} s.` : error}
          disabled={waitLeft > 0}
          extraKey={canBio ? { icon: 'fingerprint', label: 'Usar huella', onPress: tryBiometric } : undefined}
        />
      </View>
    </View>
  );
}

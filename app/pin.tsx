import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePinWait } from '../components/LockScreen';
import { PinPad } from '../components/PinPad';
import { CircleButton } from '../components/ui';
import { disableLock, enableLock, PIN_LENGTH, pinFailMessage, setPin as storePin, verifyPin } from '../lib/security';
import { colors, useTheme } from '../lib/theme';
import { showToast } from '../lib/toast';

type Mode = 'create' | 'disable' | 'change';
type Step = 'verify' | 'enter' | 'confirm';

// Vista "PIN de seguridad": crear (dos veces), cambiar (actual + nuevo) o desactivar (actual).
export default function PinScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode: rawMode } = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = rawMode === 'disable' || rawMode === 'change' ? rawMode : 'create';
  const [step, setStep] = useState<Step>(mode === 'create' ? 'enter' : 'verify');
  const [value, setValue] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [waitLeft, startWait] = usePinWait();
  const busy = useRef(false);

  useEffect(() => {
    if (value.length !== PIN_LENGTH) return;
    const pin = value;
    const run = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        await step_(pin);
      } finally {
        busy.current = false;
      }
    };
    const step_ = async (pin: string) => {
      if (step === 'verify') {
        const check = await verifyPin(pin);
        if (!check.ok) {
          if (check.waitMs > 0) startWait(check.waitMs);
          setError(pinFailMessage(check));
          setValue('');
          return;
        }
        if (mode === 'disable') {
          await disableLock();
          showToast('Bloqueo desactivado', 'lock');
          router.back();
          return;
        }
        setStep('enter');
        setValue('');
        return;
      }
      if (step === 'enter') {
        setFirst(pin);
        setStep('confirm');
        setValue('');
        return;
      }
      if (pin !== first) {
        setError('Los PIN no coinciden. Vuelve a crearlo.');
        setFirst('');
        setStep('enter');
        setValue('');
        return;
      }
      if (mode === 'change') await storePin(pin);
      else await enableLock(pin);
      showToast(mode === 'change' ? 'PIN actualizado' : 'Bloqueo activado', 'lock');
      router.back();
    };
    // Pequeña pausa para que se vea el último punto lleno.
    const t = setTimeout(run, 120);
    return () => clearTimeout(t);
  }, [value, step, first, mode, router, startWait]);

  const texts: Record<Step, { title: string; subtitle: string }> = {
    verify: { title: 'Ingresa tu PIN actual', subtitle: mode === 'disable' ? 'Para desactivar el bloqueo' : 'Para cambiarlo por uno nuevo' },
    enter: { title: mode === 'change' ? 'Nuevo PIN' : 'Crea tu PIN', subtitle: 'Protege tus datos en este celular' },
    confirm: { title: 'Confirma tu PIN', subtitle: 'Escríbelo otra vez' },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: insets.top + 28 }}>
      <View style={{ position: 'absolute', top: insets.top + 16, left: 20, zIndex: 1 }}>
        <CircleButton icon="close" label="Cancelar" onPress={() => router.back()} />
      </View>
      <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
        <PinPad
          topMargin={60}
          disabled={waitLeft > 0 && step === 'verify'}
          title={texts[step].title}
          subtitle={texts[step].subtitle}
          value={value}
          error={waitLeft > 0 && step === 'verify' ? `Demasiados intentos. Espera ${waitLeft} s.` : error}
          onChange={(v) => {
            setError(null);
            setValue(v);
          }}
        />
      </View>
    </View>
  );
}

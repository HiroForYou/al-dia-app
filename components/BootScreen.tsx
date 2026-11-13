import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';

import { Logo } from './Logo';

// Pantalla de carga: continúa la splash nativa (mismo fondo y logo) con un pulso suave mientras se leen los
// datos y las fuentes. No usa textos porque las fuentes aún pueden no estar cargadas.
export const BOOT_BG = '#0E5E63';

export function BootScreen() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [pulse]);

  return (
    <View accessibilityLabel="Cargando Al Día" style={{ flex: 1, backgroundColor: BOOT_BG, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) }],
        }}
      >
        <Logo size={120} background="#0A4A4E" ring="#0A4A4E" />
      </Animated.View>
    </View>
  );
}

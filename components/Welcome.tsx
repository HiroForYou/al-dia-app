import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { updateSettings } from '../lib/settings';
import { colors, fonts, useTheme } from '../lib/theme';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';
import { Button } from './ui';

// Bienvenida: arranca igual que la splash nativa (fondo verde + logo) y, la primera vez, muestra el
// carrusel de 3 pasos de docs/design (Bienvenida 1, 2 y 3).

const SPLASH_BG = '#0E5E63';

const STEPS: { title: string; body: string; icons: [IconName, IconName, IconName] }[] = [
  {
    title: 'No te pierdas ningún vencimiento',
    body: 'Te avisamos antes de que venzan tus tarjetas, servicios y suscripciones.',
    icons: ['bell', 'calendar', 'check'],
  },
  {
    title: 'Sabe cuánto pagar y cuándo',
    body: 'Anota el monto de tu estado de cuenta y ve el pago mínimo, el interés y lo que falta para exonerar la cuota.',
    icons: ['card', 'check', 'coin'],
  },
  {
    title: 'Sin cuenta, sin registro',
    body: 'Tus datos se guardan solo en tu celular. Protégelos con PIN o huella.',
    icons: ['bolt', 'wifi', 'play'],
  },
];

function Illustration({ icons }: { icons: [IconName, IconName, IconName] }) {
  const spots = [
    { left: 68, top: 18 },
    { left: 8, top: 106 },
    { left: 128, top: 106 },
  ];
  return (
    <View style={{ width: 200, height: 200, borderRadius: 100, backgroundColor: colors.primarySoft, alignSelf: 'center', marginTop: 50 }}>
      {icons.map((icon, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            ...spots[i],
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#073638',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <Icon name={icon} size={28} />
        </View>
      ))}
    </View>
  );
}

export function Welcome({ intro, onDone }: { intro: boolean; onDone: () => void }) {
  useTheme(); // repinta al cambiar el tema
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'splash' | 'steps'>('splash');
  const [step, setStep] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const pager = useRef<ScrollView>(null);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const overlay = useRef(new Animated.Value(1)).current;
  const stepsOpacity = useRef(new Animated.Value(0)).current;

  const finish = useCallback(() => {
    if (intro) updateSettings({ introSeen: true });
    Animated.timing(overlay, { toValue: 0, duration: 380, useNativeDriver: true }).start(onDone);
  }, [overlay, onDone, intro]);

  useEffect(() => {
    let cancelled = false;
    const ease = Easing.out(Easing.cubic);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 550, easing: ease, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 700, easing: ease, useNativeDriver: true }),
      ]),
      Animated.timing(wordOpacity, { toValue: 1, duration: 450, easing: ease, useNativeDriver: true }),
      Animated.delay(500),
    ]).start(() => {
      if (cancelled) return;
      if (!intro) {
        Animated.timing(overlay, { toValue: 0, duration: 420, useNativeDriver: true }).start(onDone);
      } else {
        setPhase('steps');
        Animated.timing(stepsOpacity, { toValue: 1, duration: 450, useNativeDriver: true }).start();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [intro, logoOpacity, logoScale, wordOpacity, overlay, stepsOpacity, onDone]);

  const goTo = (i: number) => {
    pager.current?.scrollTo({ x: i * pageWidth, animated: true });
    setStep(i);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageWidth) return;
    setStep(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
  };

  const last = step === STEPS.length - 1;

  return (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: overlay }}>
      {phase === 'splash' ? (
        <View style={{ flex: 1, backgroundColor: SPLASH_BG, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
            <Logo size={132} background="#0A4A4E" ring="#0A4A4E" />
          </Animated.View>
          <Animated.Text style={{ opacity: wordOpacity, marginTop: 22, fontFamily: fonts.sansBold, fontSize: 28, color: '#FFFFFF' }}>
            Al Día
          </Animated.Text>
          <Animated.Text style={{ opacity: wordOpacity, marginTop: 6, fontFamily: fonts.sans, fontSize: 14, color: '#CFE6E6' }}>
            Tus pagos, a tiempo
          </Animated.Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, backgroundColor: colors.bg, opacity: stepsOpacity, paddingTop: insets.top + 16 }}>
          <View style={{ height: 30, paddingHorizontal: 20, alignItems: 'flex-end' }}>
            {!last ? (
              <Pressable onPress={finish} hitSlop={10} style={{ paddingVertical: 6 }}>
                <Text style={{ fontFamily: fonts.sansSemi, fontSize: 14, color: colors.muted }}>Omitir</Text>
              </Pressable>
            ) : null}
          </View>
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}
            onMomentumScrollEnd={onScroll}
            style={{ flex: 1 }}
          >
            {STEPS.map((s, i) => (
              <View key={i} style={{ width: pageWidth || 1, paddingHorizontal: 20 }}>
                <Illustration icons={s.icons} />
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 44 }}>
                  {STEPS.map((_, j) => (
                    <View
                      key={j}
                      style={{ width: j === i ? 22 : 8, height: 8, borderRadius: 99, backgroundColor: j === i ? colors.primary : colors.track }}
                    />
                  ))}
                </View>
                <Text style={{ fontFamily: fonts.sansBold, fontSize: 28, lineHeight: 34, textAlign: 'center', marginTop: 28, color: colors.ink }}>
                  {s.title}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 12, color: colors.muted }}>
                  {s.body}
                </Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingBottom: 20 + insets.bottom }}>
            <Button label={last ? 'Comenzar' : 'Siguiente'} onPress={last ? finish : () => goTo(step + 1)} />
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

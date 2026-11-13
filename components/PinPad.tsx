import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, Text, View } from 'react-native';

import { errorHaptic, tapHaptic } from '../lib/haptics';
import { PIN_LENGTH } from '../lib/security';
import { colors, fonts } from '../lib/theme';
import { Icon, type IconName } from './Icon';
import { IconBubble, T } from './ui';

// Vista "PIN de seguridad": candado, título, puntos de progreso y teclado numérico de 3 columnas.
// `extraKey` ocupa el hueco inferior izquierdo (p. ej. huella).

export function PinPad({
  title,
  subtitle,
  value,
  onChange,
  error,
  extraKey,
  icon = 'lock',
  disabled = false,
  topMargin = 40,
}: {
  title: string;
  subtitle: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  extraKey?: { icon: IconName; label: string; onPress: () => void };
  icon?: IconName;
  /** Bloquea el teclado (espera tras demasiados intentos). */
  disabled?: boolean;
  topMargin?: number;
}) {
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!error) return;
    errorHaptic();
    AccessibilityInfo.announceForAccessibility(error);
    Animated.sequence(
      [10, -10, 8, -8, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 50, useNativeDriver: true })),
    ).start();
  }, [error, shake]);

  const press = (digit: string) => {
    if (disabled) return;
    tapHaptic();
    if (value.length < PIN_LENGTH) onChange(value + digit);
  };

  const key = (content: ReactNode, onPress: (() => void) | undefined, label: string, plain = false) => (
    <Pressable
      key={label}
      accessible={!!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress || disabled}
      style={({ pressed }) => ({
        flex: 1,
        height: 58,
        borderRadius: 18,
        backgroundColor: plain ? 'transparent' : pressed ? colors.primarySoft : colors.card,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      {content}
    </Pressable>
  );

  const digit = (d: string) =>
    key(
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.sansSemi, fontSize: 22, color: colors.ink }}>
        {d}
      </Text>,
      () => press(d),
      d,
    );

  return (
    <View>
      <View style={{ alignItems: 'center', marginTop: topMargin }}>
        <IconBubble icon={icon} size={64} iconSize={28} tone="plain" />
        <T style={{ fontFamily: fonts.sansBold, fontSize: 22, marginTop: 18, textAlign: 'center' }}>{title}</T>
        <T style={{ fontSize: 14, color: error ? colors.dangerText : colors.muted, marginTop: 6, textAlign: 'center' }}>{error ?? subtitle}</T>
        <Animated.View
          accessible
          accessibilityLabel={`${value.length} de ${PIN_LENGTH} dígitos`}
          style={{ flexDirection: 'row', gap: 16, marginTop: 28, transform: [{ translateX: shake }] }}
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i < value.length ? colors.primary : colors.track }} />
          ))}
        </Animated.View>
      </View>
      <View style={{ gap: 12, marginTop: 44 }}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row) => (
          <View key={row.join()} style={{ flexDirection: 'row', gap: 12 }}>
            {row.map(digit)}
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {extraKey
            ? key(<Icon name={extraKey.icon} size={26} />, extraKey.onPress, extraKey.label, true)
            : key(null, undefined, 'vacío', true)}
          {digit('0')}
          {key(<Icon name="back" size={24} />, value ? () => onChange(value.slice(0, -1)) : undefined, 'Borrar', true)}
        </View>
      </View>
    </View>
  );
}

import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { closeConfirm, useConfirmRequest } from '../lib/confirm';
import { currencySymbol, parseAmount } from '../lib/format';
import { closePrompt, usePromptRequest } from '../lib/prompt';
import { useLocked } from '../lib/security';
import { closeSheet, useSheetRequest } from '../lib/sheet';
import { colors, fonts, radius, useTheme } from '../lib/theme';
import { dismissToast, useToast, type ToastMessage } from '../lib/toast';
import { Icon } from './Icon';

// Capas globales montadas en el layout raíz: aviso breve, diálogo de confirmación y hoja de opciones.

export function ToastHost({ bottom }: { bottom: number }) {
  useTheme(); // repinta al cambiar el tema
  const toast = useToast();
  const [shown, setShown] = useState<ToastMessage | null>(toast);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      AccessibilityInfo.announceForAccessibility(toast.message);
      setShown(toast);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setShown(null);
      });
    }
  }, [toast, opacity]);

  if (!shown) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom,
        opacity,
        transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <View
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: radius.button,
          backgroundColor: colors.toastBg,
          shadowColor: '#073638',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Icon name={shown.icon} size={20} color="#FFFFFF" />
        <Text numberOfLines={2} style={{ flex: 1, fontFamily: fonts.sansSemi, fontSize: 13, color: '#FFFFFF' }}>
          {shown.message}
        </Text>
        {shown.actionLabel ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              shown.onAction?.();
              dismissToast();
            }}
          >
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 13, color: '#8FD1D3' }}>{shown.actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

export function ConfirmHost() {
  useTheme(); // repinta al cambiar el tema
  const request = useConfirmRequest();
  const locked = useLocked();
  if (!request || locked) return null;
  const destructive = request.destructive !== false;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={closeConfirm}>
      <Pressable
        accessible={false}
        style={{ flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}
        onPress={closeConfirm}
      >
        <Pressable
          accessible={false}
          accessibilityViewIsModal
          onAccessibilityEscape={closeConfirm}
          onPress={() => {}}
          style={{ width: '100%', backgroundColor: colors.card, borderRadius: radius.card, padding: 22 }}
        >
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 18, color: colors.ink }}>{request.title}</Text>
          <Text style={{ marginTop: 8, fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: colors.muted }}>{request.message}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
            <Pressable
              accessibilityRole="button"
              onPress={closeConfirm}
              style={{ flex: 1, minHeight: 48, borderRadius: radius.field, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink }}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const run = request.onConfirm;
                closeConfirm();
                run();
              }}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: radius.field,
                backgroundColor: destructive ? colors.dangerSolid : colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15, color: colors.white }}>{request.confirmLabel ?? 'Eliminar'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function OptionSheetHost() {
  useTheme(); // repinta al cambiar el tema
  const request = useSheetRequest();
  const insets = useSafeAreaInsets();
  const locked = useLocked();
  if (!request || locked) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={closeSheet}>
      <Pressable accessible={false} style={{ flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' }} onPress={closeSheet}>
        <Pressable
          accessible={false}
          accessibilityViewIsModal
          onAccessibilityEscape={closeSheet}
          onPress={() => {}}
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 10,
            paddingBottom: 12 + insets.bottom,
            maxHeight: '75%',
          }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.track }} />
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 17, color: colors.ink, paddingHorizontal: 20, marginTop: 14, marginBottom: 6 }}>
            {request.title}
          </Text>
          <ScrollView>
            {request.options.map((opt) => {
              const selected = opt.value === request.selected;
              return (
                <Pressable
                  key={String(opt.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    const pick = request.onPick;
                    closeSheet();
                    pick(opt.value);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    backgroundColor: pressed ? colors.primarySoft : 'transparent',
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: selected ? fonts.sansSemi : fonts.sans, fontSize: 15, color: colors.ink }}>{opt.label}</Text>
                    {opt.description ? (
                      <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: 2 }}>{opt.description}</Text>
                    ) : null}
                  </View>
                  {selected ? <Icon name="check" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Diálogo para escribir un monto (pagos de tarjeta sin estado de cuenta, recibos variables). */
export function PromptHost() {
  useTheme(); // repinta al cambiar el tema
  const request = usePromptRequest();
  const locked = useLocked();
  const [text, setText] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    setText(request?.initial ?? '');
    setError(false);
  }, [request]);

  if (!request || locked) return null;
  const submit = () => {
    const n = parseAmount(text);
    if (n === null || n <= 0) return setError(true);
    const run = request.onSubmit;
    closePrompt();
    run(n);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={closePrompt}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable
          accessible={false}
          style={{ flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}
          onPress={closePrompt}
        >
          <Pressable
            accessible={false}
            accessibilityViewIsModal
            onAccessibilityEscape={closePrompt}
            onPress={() => {}}
            style={{ width: '100%', backgroundColor: colors.card, borderRadius: radius.card, padding: 22 }}
          >
            <Text style={{ fontFamily: fonts.sansBold, fontSize: 18, color: colors.ink }}>{request.title}</Text>
            {request.message ? (
              <Text style={{ marginTop: 6, fontFamily: fonts.sans, fontSize: 14, color: colors.muted }}>{request.message}</Text>
            ) : null}
            <View
              style={{
                marginTop: 16,
                minHeight: 48,
                borderWidth: 1,
                borderColor: error ? colors.dangerText : colors.primary,
                borderRadius: radius.field,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.muted }}>{currencySymbol()}</Text>
              <TextInput
                autoFocus
                accessibilityLabel="Monto"
                value={text}
                onChangeText={(t) => {
                  setText(t);
                  setError(false);
                }}
                onSubmitEditing={submit}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.faint}
                style={{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: 10 }}
              />
            </View>
            {error ? (
              <Text style={{ marginTop: 4, fontFamily: fonts.sans, fontSize: 12, color: colors.dangerText }}>Escribe un monto mayor a cero</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <Pressable
                accessibilityRole="button"
                onPress={closePrompt}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: radius.field,
                  borderWidth: 1.5,
                  borderColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink }}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={submit}
                style={{ flex: 1, minHeight: 48, borderRadius: radius.field, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15, color: colors.onPrimary }}>{request.confirmLabel ?? 'Aceptar'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

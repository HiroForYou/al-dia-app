import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { IconName } from '../../../components/Icon';
import { IconBubble, Screen, ScreenTitle, T } from '../../../components/ui';
import { exonerationInfo } from '../../../lib/schedule';
import { useData } from '../../../lib/store';
import { colors, fonts, radius, useTheme } from '../../../lib/theme';

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

// Vista "Productos": cuadrícula de 2 columnas con cada tipo de pago.
export default function ProductsScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const data = useData();
  // Dos columnas exactas (como calc(50% - 6px) del diseño), aunque la cantidad de mosaicos sea impar.
  const [gridWidth, setGridWidth] = useState(0);
  const tileWidth = gridWidth ? (gridWidth - 12) / 2 : '47%';
  const subs = data.subscriptions.filter((s) => s.kind === 'suscripcion').length;
  const memberships = data.subscriptions.filter((s) => s.kind === 'membresia').length;
  const pendingExo = data.cards.map((c) => exonerationInfo(c)).filter((x) => x && !x.met).length;
  const withExo = data.cards.filter((c) => c.minSpend > 0).length;

  const tiles: { label: string; detail: string; icon: IconName; href: string }[] = [
    { label: 'Tarjetas', detail: count(data.cards.length, 'activa', 'activas'), icon: 'card', href: '/products/cards' },
    { label: 'Servicios', detail: count(data.services.length, 'activo', 'activos'), icon: 'bolt', href: '/products/services' },
    { label: 'Suscripciones', detail: count(subs, 'activa', 'activas'), icon: 'play', href: '/products/subscriptions' },
    { label: 'Préstamos', detail: count(data.loans.length, 'activo', 'activos'), icon: 'coin', href: '/products/loans' },
    { label: 'Membresías', detail: count(memberships, 'activa', 'activas'), icon: 'star', href: '/products/subscriptions?kind=membresia' },
    {
      label: 'Exoneraciones',
      detail: withExo === 0 ? 'Sin configurar' : pendingExo === 0 ? 'Todas cumplidas' : `${pendingExo} por cumplir`,
      icon: 'check',
      href: '/products/exonerations',
    },
  ];

  return (
    <Screen tabBar>
      <ScreenTitle title="Productos" />
      <View onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
        {tiles.map((t) => (
          <Pressable
            key={t.label}
            accessibilityRole="button"
            accessibilityLabel={`${t.label}, ${t.detail}`}
            onPress={() => router.push(t.href as never)}
            style={({ pressed }) => ({
              width: tileWidth,
              minHeight: 112,
              gap: 12,
              borderRadius: radius.card,
              backgroundColor: colors.card,
              padding: 16,
              justifyContent: 'space-between',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <IconBubble icon={t.icon} size={40} tone="solid" />
            <View>
              <T style={{ fontFamily: fonts.sansSemi, fontSize: 15 }}>{t.label}</T>
              <T style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{t.detail}</T>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

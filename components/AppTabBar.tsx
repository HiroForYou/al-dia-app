import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapHaptic } from '../lib/haptics';
import { colors, isDark, useTheme } from '../lib/theme';
import { Icon, type IconName } from './Icon';
import { tabBarBottom } from './ui';

const ICONS: Record<string, IconName> = {
  index: 'home',
  products: 'grid',
  calendar: 'calendar',
  stats: 'chart',
  settings: 'sliders',
};

// Barra inferior del diseño: píldora verde flotante con íconos; la pestaña activa va en círculo blanco.
export function AppTabBar({ state, descriptors, navigation }: any) {
  useTheme(); // repinta al cambiar el tema
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 20, right: 20, bottom: tabBarBottom(insets.bottom), alignItems: 'center' }}>
      <View
        accessibilityRole="tablist"
        style={{
          width: '100%',
          maxWidth: 420,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.primary,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          shadowColor: '#073638',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: 10,
          // En tema oscuro la sombra no se ve: un borde fino separa la barra del fondo.
          borderWidth: isDark() ? 1 : 0,
          borderColor: colors.border,
        }}
      >
        {state.routes.map((route: any, i: number) => {
          const focused = state.index === i;
          const label = descriptors[route.key].options.title ?? route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!event.defaultPrevented) {
                  if (!focused) tapHaptic();
                  // En Productos, tocar la pestaña activa vuelve a la cuadrícula.
                  if (focused && route.state?.index > 0) navigation.navigate(route.name, { screen: 'index' });
                  else if (!focused) navigation.navigate(route.name, route.params);
                }
              }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: focused ? colors.white : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={ICONS[route.name] ?? 'home'} size={22} color={focused ? colors.onWhite : colors.white} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

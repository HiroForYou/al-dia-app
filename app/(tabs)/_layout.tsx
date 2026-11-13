import { Tabs } from 'expo-router';

import { AppTabBar } from '../../components/AppTabBar';
import { colors, useTheme } from '../../lib/theme';

export default function TabsLayout() {
  useTheme(); // repinta al cambiar el tema
  return (
    <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="products" options={{ title: 'Productos' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendario' }} />
      <Tabs.Screen name="stats" options={{ title: 'Estadísticas' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}

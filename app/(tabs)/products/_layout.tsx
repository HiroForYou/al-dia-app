import { Stack } from 'expo-router';

import { colors, useTheme } from '../../../lib/theme';

// Las listas de Productos viven dentro de la pestaña para conservar la barra flotante (como en el diseño);
// los detalles y formularios se abren por encima, sin barra.
export default function ProductsLayout() {
  useTheme(); // repinta al cambiar el tema
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }} />;
}

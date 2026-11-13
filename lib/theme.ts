import { useSyncExternalStore } from 'react';

// Tokens del diseño "Al Día" (docs/design): fondo gris claro, tarjetas blancas y acento verde azulado.
// `colors` es un objeto mutable: al cambiar el tema se copian encima los valores de la otra paleta y las
// pantallas suscritas con useTheme() se repintan, así los estilos en línea siguen funcionando.

export type Palette = {
  bg: string;
  card: string;
  ink: string;
  muted: string;
  faint: string;
  line: string;
  border: string;
  track: string;
  primary: string;
  primaryDark: string;
  primaryDeep: string;
  primarySoft: string;
  primaryOnSoft: string;
  onPrimary: string;
  onPrimaryMuted: string;
  success: string;
  white: string;
  scrim: string;
  /** Fondo de botones destructivos con texto blanco (contraste AA en ambos temas). */
  dangerSolid: string;
  toastBg: string;
  /** Tinta sobre superficies que siempre son blancas (círculo activo de la barra de pestañas). */
  onWhite: string;
  // Estados (Vencido / Por vencer / Pagado).
  dangerText: string;
  dangerBg: string;
  dangerBorder: string;
  warnText: string;
  warnBg: string;
  warnBorder: string;
  okText: string;
  okBg: string;
  okBorder: string;
};

export const lightPalette: Palette = {
  bg: '#F7F7F8',
  card: '#FFFFFF',
  ink: '#1C1C1E',
  muted: '#6B6B76',
  faint: '#878793',
  line: '#ECECEF',
  border: '#DDDDE2',
  track: '#D4D4DA',
  primary: '#0E5E63',
  primaryDark: '#0A4A4E',
  primaryDeep: '#073638',
  primarySoft: '#E3F0F0',
  primaryOnSoft: '#0E5E63',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: '#CFE6E6',
  success: '#22A06B',
  white: '#FFFFFF',
  scrim: 'rgba(7,54,56,0.45)',
  dangerSolid: '#C62828',
  toastBg: 'rgba(7, 54, 56, 0.92)',
  onWhite: '#1C1C1E',
  dangerText: '#C62828',
  dangerBg: '#FDE8E8',
  dangerBorder: '#F4B8B8',
  warnText: '#9A5B00',
  warnBg: '#FFF1D6',
  warnBorder: '#F0C97A',
  okText: '#1F7A4D',
  okBg: '#E2F5EA',
  okBorder: '#A6DCC0',
};

// Variante oscura derivada del mismo verde (el diseño solo trae la clara).
export const darkPalette: Palette = {
  bg: '#0F1415',
  card: '#1A2122',
  ink: '#F2F3F4',
  muted: '#9CA6A8',
  faint: '#6E7778',
  line: '#263031',
  border: '#2F3A3B',
  track: '#66726F',
  primary: '#13777D',
  primaryDark: '#0E5E63',
  primaryDeep: '#0A4A4E',
  primarySoft: '#16393B',
  primaryOnSoft: '#8FD1D3',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: '#CFE6E6',
  success: '#2FB57C',
  white: '#FFFFFF',
  scrim: 'rgba(0,0,0,0.6)',
  dangerSolid: '#B3261E',
  toastBg: '#24494B',
  onWhite: '#1C1C1E',
  dangerText: '#FF8A80',
  dangerBg: '#3A1D1D',
  dangerBorder: '#6B2B2B',
  warnText: '#F5C26B',
  warnBg: '#3A2E14',
  warnBorder: '#6B5220',
  okText: '#7DDBA8',
  okBg: '#173326',
  okBorder: '#2A5A42',
};

export const colors: Palette = { ...lightPalette };

let darkActive = false;
const listeners = new Set<() => void>();

/**
 * Copia la paleta sobre `colors`. Se llama durante el render del layout raíz (los hijos de esa misma pasada
 * ya leen la paleta nueva); notifyTheme() avisa después a las pantallas memorizadas para que se repinten.
 */
export function applyTheme(dark: boolean): boolean {
  if (dark === darkActive) return false;
  darkActive = dark;
  Object.assign(colors, dark ? darkPalette : lightPalette);
  return true;
}

export function notifyTheme(): void {
  listeners.forEach((l) => l());
}

export function isDark(): boolean {
  return darkActive;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Suscribe el componente al tema: al cambiar, se vuelve a pintar con los nuevos `colors`. Lo usan todas las
 * pantallas y capas globales (las pantallas de la navegación no se repintan solas porque están memorizadas).
 */
export function useTheme(): boolean {
  return useSyncExternalStore(subscribe, () => darkActive);
}

/** Colores de las tarjetas de crédito (se reparten en orden como en "Mis tarjetas"). */
export const CARD_TONES = ['#0E5E63', '#0A4A4E', '#073638', '#2C6E73', '#3D5A5C'];

export const fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
};

export const radius = { field: 14, button: 16, card: 20, chip: 99 };

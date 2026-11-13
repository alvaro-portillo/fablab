/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#16171A',
    accent: '#C8102E',
    background: '#F6F6F8',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECECF0',
    textSecondary: '#6B6F76',
  },
  dark: {
    text: '#F2F2F4',
    accent: '#FF6B7D',
    background: '#0E0F11',
    backgroundElement: '#1A1B1E',
    backgroundSelected: '#2A2C30',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
/** Ancho máximo del contenido en celular y tableta: una columna cómoda de leer. */
export const MaxContentWidth = 800;
/**
 * Ancho máximo en escritorio. La ventana puede medir 1920 px: sin esto el
 * contenido queda como una franja de celular estirada en el centro.
 */
export const MaxContentWidthEscritorio = 1240;
/**
 * Ancho máximo de un campo de texto (y de los botones que van debajo, para que
 * queden alineados) en escritorio. Vale justo el ancho que el campo ya ocupa en
 * tableta, así el campo nunca se angosta al agrandar la ventana: con 560 el
 * campo medía 720 px a 999 y 560 px a 1000, un salto hacia atrás al pasar el
 * corte de escritorio.
 */
export const MaxAnchoControlEscritorio = 720;

/** Puntos de corte, medidos sobre el ancho de la ventana (px CSS). */
export const Breakpoints = {
  /** Desde aquí la ventana es de escritorio: sobra ancho para varias columnas. */
  escritorio: 1000,
} as const;

/** Sombra suave común a las tarjetas (solo web la dibuja; en nativo se ignora). */
export const SombraTarjeta = { boxShadow: '0 1px 2px rgba(16,17,20,0.04), 0 4px 12px rgba(16,17,20,0.04)' } as const;

/**
 * Rojo para texto y bordes que sigue al tema en web: los StyleSheet son fijos,
 * así que se apunta a una variable CSS que _layout cambia con el modo. En el
 * oscuro el rojo de marca casi no se leía sobre el fondo. En nativo, rojo fijo.
 */
export const RojoTexto = Platform.OS === 'web' ? 'var(--rojo-texto, #C8102E)' : '#C8102E';

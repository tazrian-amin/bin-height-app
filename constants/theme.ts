/**
 * Mining Sentry brand theme — from globals.css.
 * --color-primary-500: #ffc500
 * --color-accent-500: #4cb1e5
 * --color-black: #050404
 * --font-brand: Anton
 * --font-base: Roboto
 */

import { Platform } from 'react-native';

export const MiningSentryColors = {
  primary500: '#ffc500',
  accent500: '#4cb1e5',
  black: '#050404',
} as const;

const primary = MiningSentryColors.primary500;
const accent = MiningSentryColors.accent500;
const black = MiningSentryColors.black;

export const Colors = {
  light: {
    text: black,
    background: '#f8f8f8',
    tint: accent,
    icon: '#4a5568',
    tabIconDefault: '#4a5568',
    tabIconSelected: accent,
    primary,
    accent,
    card: '#ffffff',
    border: 'rgba(5,4,4,0.08)',
    success: '#2d7d46',
    warning: '#b8860b',
    error: '#c53030',
  },
  dark: {
    text: '#e8eaed',
    background: '#0c0b0b',
    tint: accent,
    icon: '#9ca3af',
    tabIconDefault: '#9ca3af',
    tabIconSelected: accent,
    primary,
    accent,
    card: '#141212',
    border: 'rgba(255,255,255,0.08)',
    success: '#38a169',
    warning: '#d69e2e',
    error: '#e53e3e',
  },
};

/** Font family names after loading via useFonts (Anton, Roboto) */
export const MiningSentryFonts = {
  fontBrand: 'Anton_400Regular',
  fontBase: 'Roboto_400Regular',
  fontBaseMedium: 'Roboto_500Medium',
  fontBaseBold: 'Roboto_700Bold',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
    brand: MiningSentryFonts.fontBrand,
    base: MiningSentryFonts.fontBase,
    baseMedium: MiningSentryFonts.fontBaseMedium,
    baseBold: MiningSentryFonts.fontBaseBold,
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    brand: MiningSentryFonts.fontBrand,
    base: MiningSentryFonts.fontBase,
    baseMedium: MiningSentryFonts.fontBaseMedium,
    baseBold: MiningSentryFonts.fontBaseBold,
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    brand: MiningSentryFonts.fontBrand,
    base: MiningSentryFonts.fontBase,
    baseMedium: MiningSentryFonts.fontBaseMedium,
    baseBold: MiningSentryFonts.fontBaseBold,
  },
});

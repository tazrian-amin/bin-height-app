import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

import { Colors } from '@/constants/theme';

const baseLight = DefaultTheme.colors;
const baseDark = DarkTheme.colors;

export const MiningSentryNavigationLight: Theme = {
  ...DefaultTheme,
  colors: {
    ...baseLight,
    primary: Colors.light.accent,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.border,
    notification: Colors.light.primary,
  },
};

export const MiningSentryNavigationDark: Theme = {
  ...DarkTheme,
  colors: {
    ...baseDark,
    primary: Colors.dark.accent,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.primary,
  },
};

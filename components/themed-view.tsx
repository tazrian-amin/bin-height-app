import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  /** `card` uses branded card surface, border, and subtle elevation. */
  variant?: 'background' | 'card';
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  variant = 'background',
  ...otherProps
}: ThemedViewProps) {
  const backgroundKey = variant === 'card' ? 'card' : 'background';
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    backgroundKey,
  );
  const borderColor = useThemeColor({}, 'border');

  return (
    <View
      style={[
        { backgroundColor },
        variant === 'card' ? [styles.cardSurface, { borderColor }] : null,
        style,
      ]}
      {...otherProps}
    />
  );
}

const styles = StyleSheet.create({
  cardSurface: {
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#050404',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
});

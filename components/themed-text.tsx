import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

const font = Fonts ?? {};

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const accent = useThemeColor({}, 'accent');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link'
          ? [styles.link, { color: lightColor ?? darkColor ?? accent }]
          : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: font.base,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: font.baseMedium,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: font.brand,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: font.brand,
    letterSpacing: 0.3,
  },
  link: {
    lineHeight: 24,
    fontSize: 16,
    fontFamily: font.baseMedium,
  },
});

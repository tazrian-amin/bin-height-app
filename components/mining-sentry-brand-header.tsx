import React, { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors, Fonts, MiningSentryColors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

type MiningSentryBrandHeaderProps = {
  /** Shown under the brand line (e.g. screen context). */
  subtitle?: string;
  /** Optional icon or adornment rendered before subtitle text (e.g. transport). */
  subtitleLeading?: ReactNode;
};

export function MiningSentryBrandHeader({
  subtitle,
  subtitleLeading,
}: MiningSentryBrandHeaderProps) {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const miningWordColor = scheme === "dark" ? "#ffffff" : palette.text;
  const fontBrand = Fonts?.brand ?? "System";
  const divider = useThemeColor({}, "border");

  return (
    <View style={[styles.wrap, { borderBottomColor: divider }]}>
      <View style={styles.titleRow}>
        <Text
          style={[
            styles.brandWord,
            { color: miningWordColor, fontFamily: fontBrand },
          ]}
        >
          MINING{" "}
        </Text>
        <Text
          style={[
            styles.brandWord,
            { color: MiningSentryColors.primary500, fontFamily: fontBrand },
          ]}
        >
          SENTRY
        </Text>
      </View>
      <ThemedText style={styles.tagline}>Bin Height Measurement</ThemedText>
      {subtitle ? (
        <View style={styles.subtitleRow}>
          {subtitleLeading}
          <ThemedText type="defaultSemiBold" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 6,
    paddingBottom: 16,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  brandWord: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 0.6,
    textAlign: "center",
  },
  tagline: {
    fontSize: 14,
    opacity: 0.82,
    textAlign: "center",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    opacity: 0.95,
  },
});

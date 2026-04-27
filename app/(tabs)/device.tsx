import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LatestAdcCard } from "@/components/home/latest-adc-card";
import { MiningSentryBrandHeader } from "@/components/mining-sentry-brand-header";
import { ThemedText } from "@/components/themed-text";
import { useBinHeightTransport } from "@/contexts/bin-height-transport-context";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function DeviceScreen() {
  const { displaySource, displayLatestAdc } = useBinHeightTransport();
  const screenBg = useThemeColor({}, "background");
  const sourceLabel = displaySource === "usb" ? "USB (wired)" : "Bluetooth";

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: screenBg }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <MiningSentryBrandHeader subtitle="Live reading" />
        <View style={styles.meta}>
          <ThemedText style={styles.metaText}>
            Source: {sourceLabel}. To change link or device, open Configure.
          </ThemedText>
        </View>
        <LatestAdcCard latestAdc={displayLatestAdc} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  meta: {
    marginBottom: 4,
  },
  metaText: {
    textAlign: "center",
    opacity: 0.78,
    fontSize: 13,
    lineHeight: 18,
  },
});

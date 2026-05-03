import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LatestAdcCard } from "@/components/home/latest-adc-card";
import { MiningSentryBrandHeader } from "@/components/mining-sentry-brand-header";
import { useBinHeightTransport } from "@/contexts/bin-height-transport-context";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function DeviceScreen() {
  const { displaySource, displayLatestAdc } = useBinHeightTransport();
  const screenBg = useThemeColor({}, "background");
  const iconColor = useThemeColor({}, "text");
  const isWireless = displaySource === "ble";

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: screenBg }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <MiningSentryBrandHeader
          subtitle="Live reading"
          subtitleLeading={
            <MaterialIcons
              name={isWireless ? "bluetooth" : "usb"}
              size={22}
              color={iconColor}
              accessibilityLabel={isWireless ? "Bluetooth connection" : "USB connection"}
            />
          }
        />
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
});

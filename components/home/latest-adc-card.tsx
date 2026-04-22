import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";

import { IndustrialBinHopper } from "@/components/industrial-bin-hopper";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

const DEFAULT_MAX_ADC = 4095;

export type LatestAdcCardProps = {
  latestAdc: number | null;
  maxAdc?: number;
  material?: string;
};

export function LatestAdcCard({
  latestAdc,
  maxAdc = DEFAULT_MAX_ADC,
  material = "Ore",
}: LatestAdcCardProps) {
  const { width: screenW } = useWindowDimensions();

  const hopperWidth = useMemo(
    () => Math.min(300, Math.max(240, screenW - 88)),
    [screenW],
  );

  const max = Math.max(1, maxAdc);
  const fillLevel =
    latestAdc == null
      ? 0
      : Math.min(100, Math.max(0, (latestAdc / max) * 100));

  return (
    <ThemedView variant="card" style={styles.card}>
      <ThemedText type="subtitle">Current Material Height</ThemedText>
      <IndustrialBinHopper
        fillLevel={fillLevel}
        capacity={max}
        material={material}
        width={hopperWidth}
        loadUnitLabel="ADC counts"
      />
      <ThemedText type="title" style={styles.adcValue}>
        {latestAdc == null ? "—" : String(latestAdc)}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  adcValue: {
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
});

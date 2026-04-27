import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Fonts, MiningSentryColors } from "@/constants/theme";
import type { BleDiscoveredDevice } from "@/hooks/ble-adc-types";
import { useColorScheme } from "@/hooks/use-color-scheme";

export type BleHm10CardProps = {
  discoveredDevices: BleDiscoveredDevice[];
  selectedDeviceId: string | null;
  isScanning: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  onStartScan: () => void;
  onStopScan: () => void;
  onSelectDevice: (id: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function BleHm10Card({
  discoveredDevices,
  selectedDeviceId,
  isScanning,
  isConnecting,
  isConnected,
  onStartScan,
  onStopScan,
  onSelectDevice,
  onConnect,
  onDisconnect,
}: BleHm10CardProps) {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const miningWordColor = scheme === "dark" ? "#ffffff" : palette.text;
  const fontBrand = Fonts?.brand ?? "System";

  const selected = useMemo(
    () => discoveredDevices.find((d) => d.id === selectedDeviceId) ?? null,
    [discoveredDevices, selectedDeviceId],
  );

  return (
    <ThemedView variant="card" style={styles.card}>
      <View style={styles.brandTitleWrap}>
        <Text style={[styles.brandTitle, { color: miningWordColor, fontFamily: fontBrand }]}>
          MINING{" "}
        </Text>
        <Text
          style={[
            styles.brandTitle,
            { color: MiningSentryColors.primary500, fontFamily: fontBrand },
          ]}
        >
          SENTRY
        </Text>
        <Text style={[styles.brandTitle, { color: miningWordColor, fontFamily: fontBrand }]}>
          {" "}
          Bluetooth (HM-10)
        </Text>
      </View>
      <ThemedText style={styles.muted}>
        Scan for your HM-10 (or compatible FFE0/FFE1 UART module), select it, then connect.
      </ThemedText>

      <View style={styles.row}>
        <Pressable
          style={[
            styles.button,
            styles.buttonScan,
            {
              borderColor: palette.accent,
              backgroundColor:
                scheme === "dark"
                  ? "rgba(76, 177, 229, 0.12)"
                  : "rgba(76, 177, 229, 0.14)",
            },
          ]}
          onPress={() => void onStartScan()}
          disabled={isScanning || isConnecting}
        >
          {isScanning ? (
            <View style={styles.rowInner}>
              <ActivityIndicator size="small" color={palette.accent} />
              <ThemedText type="defaultSemiBold">Scanning…</ThemedText>
            </View>
          ) : (
            <ThemedText type="defaultSemiBold">Scan</ThemedText>
          )}
        </Pressable>

        <Pressable
          style={[
            styles.button,
            styles.buttonFlex,
            { borderColor: palette.border, backgroundColor: "transparent" },
          ]}
          onPress={() => void onStopScan()}
          disabled={!isScanning}
        >
          <ThemedText type="defaultSemiBold">Stop scan</ThemedText>
        </Pressable>
      </View>

      <View style={styles.row}>
        {isConnected ? (
          <Pressable
            style={[
              styles.button,
              styles.buttonFull,
              {
                borderColor: palette.error,
                backgroundColor:
                  scheme === "dark"
                    ? "rgba(229, 62, 62, 0.12)"
                    : "rgba(197, 48, 48, 0.12)",
              },
            ]}
            onPress={() => void onDisconnect()}
          >
            <ThemedText type="defaultSemiBold">Disconnect BLE</ThemedText>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.button,
              styles.buttonFull,
              {
                borderColor: palette.primary,
                backgroundColor:
                  scheme === "dark"
                    ? "rgba(255, 197, 0, 0.12)"
                    : "rgba(255, 197, 0, 0.22)",
              },
            ]}
            onPress={() => void onConnect()}
            disabled={isConnecting || selectedDeviceId == null}
          >
            <ThemedText type="defaultSemiBold">
              {isConnecting ? "Connecting…" : "Connect"}
            </ThemedText>
          </Pressable>
        )}
      </View>

      <ThemedText style={styles.muted}>
        Selected:{" "}
        <ThemedText type="defaultSemiBold">
          {selected
            ? `${selected.name ?? "Unnamed"} • ${selected.id}`
            : "None — tap a device below after scanning"}
        </ThemedText>
      </ThemedText>

      <ThemedText style={styles.muted}>
        Status:{" "}
        <ThemedText
          type="defaultSemiBold"
          lightColor={
            isConnected
              ? palette.success
              : isConnecting || isScanning
                ? palette.accent
                : palette.icon
          }
          darkColor={
            isConnected
              ? palette.success
              : isConnecting || isScanning
                ? palette.accent
                : palette.icon
          }
        >
          {isConnected
            ? "Connected (notifications)"
            : isConnecting
              ? "Connecting"
              : isScanning
                ? "Scanning"
                : "Disconnected"}
        </ThemedText>
      </ThemedText>

      <ThemedText type="defaultSemiBold" style={styles.listTitle}>
        Nearby devices
      </ThemedText>
      <ScrollView
        style={styles.list}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {discoveredDevices.length === 0 ? (
          <ThemedText style={styles.muted}>No devices yet — start a scan.</ThemedText>
        ) : (
          discoveredDevices.map((d) => {
            const active = d.id === selectedDeviceId;
            return (
              <Pressable
                key={d.id}
                onPress={() => onSelectDevice(d.id)}
                style={[
                  styles.deviceRow,
                  {
                    borderColor: active ? palette.accent : palette.border,
                    backgroundColor: active
                      ? scheme === "dark"
                        ? "rgba(76, 177, 229, 0.12)"
                        : "rgba(76, 177, 229, 0.14)"
                      : "transparent",
                  },
                ]}
              >
                <ThemedText type="defaultSemiBold">{d.name ?? "Unnamed device"}</ThemedText>
                <ThemedText style={styles.deviceId}>{d.id}</ThemedText>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  brandTitleWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  brandTitle: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  muted: {
    opacity: 0.78,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonScan: {
    flexShrink: 0,
    minWidth: 120,
  },
  buttonFlex: {
    flex: 1,
    minWidth: 0,
  },
  buttonFull: {
    flex: 1,
  },
  listTitle: {
    marginTop: 4,
  },
  list: {
    maxHeight: 200,
  },
  deviceRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 8,
    gap: 4,
  },
  deviceId: {
    fontSize: 11,
    opacity: 0.65,
  },
});

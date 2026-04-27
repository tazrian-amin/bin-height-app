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
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { UsbDevice } from "@/utils/usb-serial-adc";

export type UsbSerialCardProps = {
  devices: UsbDevice[];
  selectedDeviceId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  isReconnecting: boolean;
  onRefreshDevices: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onCancelAutoReconnect: () => void;
  /** When set, shows a tappable list so the user can pick which USB serial device to use. */
  onSelectDevice?: (deviceId: number) => void;
};

export function UsbSerialCard({
  devices,
  selectedDeviceId,
  isConnecting,
  isConnected,
  isReconnecting,
  onRefreshDevices,
  onConnect,
  onDisconnect,
  onCancelAutoReconnect,
  onSelectDevice,
}: UsbSerialCardProps) {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const miningWordColor = scheme === "dark" ? "#ffffff" : palette.text;
  const fontBrand = Fonts?.brand ?? "System";

  const selectedDevice = useMemo(
    () => devices.find((d) => d.deviceId === selectedDeviceId) ?? null,
    [devices, selectedDeviceId],
  );

  return (
    <ThemedView variant="card" style={styles.card}>
      <View style={styles.brandTitleWrap}>
        <Text style={[styles.brandTitle, { color: miningWordColor, fontFamily: fontBrand }]}>
          MINING{" "}
        </Text>
        <Text
          style={[styles.brandTitle, { color: MiningSentryColors.primary500, fontFamily: fontBrand }]}
        >
          SENTRY
        </Text>
        <Text style={[styles.brandTitle, { color: miningWordColor, fontFamily: fontBrand }]}>
          {" "}
          Bin Height Measurement
        </Text>
      </View>
      <ThemedText style={styles.muted}>
        Connect your device to monitor your bin now!
      </ThemedText>

      {isReconnecting ? (
        <View
          style={[
            styles.reconnectBanner,
            {
              borderColor: palette.warning,
              backgroundColor:
                scheme === "dark"
                  ? "rgba(214, 158, 46, 0.12)"
                  : "rgba(184, 134, 11, 0.12)",
            },
          ]}
        >
          <View style={styles.reconnectRow}>
            <ActivityIndicator size="small" color={palette.accent} />
            <ThemedText type="defaultSemiBold" style={styles.reconnectText}>
              Connection lost — refreshing the device list and reconnecting…
            </ThemedText>
          </View>
          <Pressable
            style={[
              styles.button,
              styles.cancelButton,
              { borderColor: palette.border },
            ]}
            onPress={onCancelAutoReconnect}
          >
            <ThemedText type="defaultSemiBold">Stop retrying</ThemedText>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.row}>
        <Pressable
          style={[
            styles.button,
            styles.buttonRefresh,
            {
              borderColor: palette.accent,
              backgroundColor:
                scheme === "dark"
                  ? "rgba(76, 177, 229, 0.12)"
                  : "rgba(76, 177, 229, 0.14)",
            },
          ]}
          onPress={onRefreshDevices}
          disabled={isConnecting || isReconnecting}
        >
          <ThemedText type="defaultSemiBold">Refresh devices</ThemedText>
        </Pressable>

        {isConnected ? (
          <Pressable
            style={[
              styles.button,
              styles.buttonFlex,
              {
                borderColor: palette.error,
                backgroundColor:
                  scheme === "dark"
                    ? "rgba(229, 62, 62, 0.12)"
                    : "rgba(197, 48, 48, 0.12)",
              },
            ]}
            onPress={onDisconnect}
          >
            <ThemedText type="defaultSemiBold">Disconnect</ThemedText>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.button,
              styles.buttonFlex,
              {
                borderColor: palette.primary,
                backgroundColor:
                  scheme === "dark"
                    ? "rgba(255, 197, 0, 0.12)"
                    : "rgba(255, 197, 0, 0.22)",
              },
            ]}
            onPress={onConnect}
            disabled={isConnecting || isReconnecting}
          >
            <ThemedText type="defaultSemiBold">
              {isReconnecting
                ? "Reconnecting…"
                : isConnecting
                  ? "Connecting…"
                  : "Connect"}
            </ThemedText>
          </Pressable>
        )}
      </View>

      <ThemedText style={styles.muted}>
        Selected device:{" "}
        <ThemedText type="defaultSemiBold">
          {selectedDevice
            ? `${selectedDevice.deviceId}${selectedDevice.productName ? ` • ${selectedDevice.productName}` : ""}`
            : devices.length === 0
              ? "None (no devices)"
              : onSelectDevice != null
                ? "None — tap a row below after refresh"
                : "None"}
        </ThemedText>
      </ThemedText>

      {onSelectDevice != null && devices.length > 0 ? (
        <>
          <ThemedText type="defaultSemiBold" style={styles.listTitle}>
            USB devices
          </ThemedText>
          <ScrollView
            style={styles.list}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {devices.map((d) => {
              const active = d.deviceId === selectedDeviceId;
              return (
                <Pressable
                  key={d.deviceId}
                  onPress={() => onSelectDevice(d.deviceId)}
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
                  <ThemedText type="defaultSemiBold">
                    {d.productName ?? d.deviceName ?? "USB serial device"}
                  </ThemedText>
                  <ThemedText style={styles.deviceMeta}>
                    ID {d.deviceId}
                    {d.vendorId != null && d.productId != null
                      ? ` • VID ${d.vendorId} PID ${d.productId}`
                      : ""}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      <ThemedText style={styles.muted}>
        Status:{" "}
        <ThemedText
          type="defaultSemiBold"
          lightColor={
            isConnected
              ? palette.success
              : isReconnecting || isConnecting
                ? palette.accent
                : palette.icon
          }
          darkColor={
            isConnected
              ? palette.success
              : isReconnecting || isConnecting
                ? palette.accent
                : palette.icon
          }
        >
          {isConnected
            ? "Connected"
            : isReconnecting
              ? "Reconnecting"
              : isConnecting
                ? "Connecting"
                : "Disconnected"}
        </ThemedText>
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
  brandTitleWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  brandTitle: {
    fontSize: 22,
    lineHeight: 28,
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
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonRefresh: {
    flexShrink: 0,
  },
  buttonFlex: {
    flex: 1,
    minWidth: 0,
  },
  reconnectBanner: {
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  reconnectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reconnectText: {
    flex: 1,
    opacity: 0.92,
  },
  cancelButton: {
    alignSelf: "flex-start",
    backgroundColor: "transparent",
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
  deviceMeta: {
    fontSize: 11,
    opacity: 0.65,
  },
});

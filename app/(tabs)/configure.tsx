import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ConfigureConnectionStatusCard,
  type ConnectionStatus,
} from "@/components/configure-connection-status-card";
import { MiningSentryBrandHeader } from "@/components/mining-sentry-brand-header";
import { ThemedText } from "@/components/themed-text";
import { Colors, MiningSentryColors } from "@/constants/theme";
import { useBinHeightTransport } from "@/contexts/bin-height-transport-context";
import type { DisplayTransport } from "@/hooks/ble-adc-types";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
export default function ConfigureScreen() {
  const router = useRouter();
  const { usb, ble, setDisplaySource } = useBinHeightTransport();
  const [transport, setTransport] = useState<DisplayTransport>("usb");
  const [usbScanBusy, setUsbScanBusy] = useState(false);
  const [showConnectionCardUsb, setShowConnectionCardUsb] = useState(false);
  const [showConnectionCardBle, setShowConnectionCardBle] = useState(false);

  const screenBg = useThemeColor({}, "background");
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  const prevUsbConnected = useRef<boolean | null>(null);
  const prevBleConnected = useRef<boolean | null>(null);

  useEffect(() => {
    setDisplaySource(transport);
  }, [transport, setDisplaySource]);

  const applyTransport = useCallback(
    (next: DisplayTransport) => {
      if (next === "ble" && Platform.OS === "web") return;
      if (next === "usb") {
        void ble.disconnect();
        void ble.stopScan();
        setShowConnectionCardBle(false);
      } else {
        usb.disconnect();
        void ble.stopScan();
        setShowConnectionCardUsb(false);
      }
      setTransport(next);
    },
    [ble, usb],
  );

  useEffect(() => {
    if (transport === "usb" && (usb.isConnected || usb.isReconnecting)) {
      setShowConnectionCardUsb(true);
    }
  }, [transport, usb.isConnected, usb.isReconnecting]);

  useEffect(() => {
    if (transport === "ble" && (ble.isConnected || ble.isReconnecting)) {
      setShowConnectionCardBle(true);
    }
  }, [transport, ble.isConnected, ble.isReconnecting]);

  useEffect(() => {
    if (transport !== "usb") return;
    prevUsbConnected.current = usb.isConnected;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport]);

  useEffect(() => {
    if (transport !== "usb") return;
    const cur = usb.isConnected;
    if (prevUsbConnected.current !== true && cur === true) {
      router.replace("/device");
    }
    prevUsbConnected.current = cur;
  }, [transport, usb.isConnected, router]);

  useEffect(() => {
    if (transport !== "ble") return;
    prevBleConnected.current = ble.isConnected;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport]);

  useEffect(() => {
    if (transport !== "ble") return;
    const cur = ble.isConnected;
    if (prevBleConnected.current !== true && cur === true) {
      router.replace("/device");
    }
    prevBleConnected.current = cur;
  }, [transport, ble.isConnected, router]);

  const onScanDevices = useCallback(async () => {
    if (transport === "usb") {
      setUsbScanBusy(true);
      try {
        await usb.refreshDevices();
      } finally {
        setUsbScanBusy(false);
      }
      return;
    }
    if (Platform.OS !== "web") {
      await ble.startScan();
    }
  }, [transport, usb, ble]);

  const onStopScan = useCallback(async () => {
    await ble.stopScan();
  }, [ble]);

  const onDeviceRowPress = useCallback(
    async (kind: "usb" | "ble", id: number | string) => {
      if (usb.isConnecting || ble.isConnecting) return;
      try {
        if (kind === "usb") {
          await usb.connectToDeviceId(id as number);
        } else {
          await ble.connectToDeviceId(id as string);
        }
      } catch {
        // Errors surfaced via hooks / alerts
      }
    },
    [usb, ble],
  );

  const listRows: {
    key: string;
    kind: "usb" | "ble";
    id: number | string;
    title: string;
    sub: string;
  }[] =
    transport === "usb"
      ? usb.devices.map((d) => ({
          key: `u-${d.deviceId}`,
          kind: "usb" as const,
          id: d.deviceId,
          title: d.productName ?? d.deviceName ?? "USB serial device",
          sub: `ID ${d.deviceId}${d.vendorId != null && d.productId != null ? ` • VID ${d.vendorId} PID ${d.productId}` : ""}`,
        }))
      : ble.discoveredDevices.map((d) => ({
          key: `b-${d.id}`,
          kind: "ble" as const,
          id: d.id,
          title: d.name ?? "Unnamed BLE device",
          sub: d.id,
        }));

  const scanBusy = transport === "usb" ? usbScanBusy : ble.isScanning;
  const connecting = usb.isConnecting || ble.isConnecting;

  const showUsbCard = transport === "usb" && showConnectionCardUsb;
  const showBleCard =
    transport === "ble" && showConnectionCardBle && Platform.OS !== "web";

  const usbMeta =
    usb.selectedDeviceId != null
      ? usb.devices.find((d) => d.deviceId === usb.selectedDeviceId)
      : null;
  const usbCardTitle =
    usbMeta?.productName ?? usbMeta?.deviceName ?? "USB serial device";
  const usbCardSubtitle = usbMeta ? `Device ID ${usbMeta.deviceId}` : "";
  const usbCardStatus: ConnectionStatus = usb.isConnected
    ? "connected"
    : usb.isReconnecting
      ? "reconnecting"
      : "disconnected";

  const bleMeta =
    ble.selectedDeviceId != null
      ? ble.discoveredDevices.find((d) => d.id === ble.selectedDeviceId)
      : null;
  const bleCardTitle = bleMeta?.name ?? "Bluetooth device";
  const bleCardSubtitle = ble.selectedDeviceId ?? "";
  const bleCardStatus: ConnectionStatus = ble.isConnected
    ? "connected"
    : ble.isReconnecting
      ? "reconnecting"
      : "disconnected";

  const onUsbStopReconnect = useCallback(() => {
    usb.cancelAutoReconnect();
  }, [usb]);

  const onUsbReconnect = useCallback(async () => {
    usb.cancelAutoReconnect();
    await usb.refreshDevices();
    void usb.connect();
  }, [usb]);

  const onUsbDisconnectSession = useCallback(() => {
    usb.disconnect();
    usb.setSelectedDeviceId(null);
    setShowConnectionCardUsb(false);
  }, [usb]);

  const onBleStopReconnect = useCallback(() => {
    ble.cancelAutoReconnect();
  }, [ble]);

  const onBleReconnect = useCallback(async () => {
    ble.cancelAutoReconnect();
    void ble.connect();
  }, [ble]);

  const onBleDisconnectSession = useCallback(() => {
    void ble.disconnect();
    ble.setSelectedDeviceId(null);
    setShowConnectionCardBle(false);
  }, [ble]);

  const modeSelectedBg =
    scheme === "dark" ? "rgba(255, 197, 0, 0.42)" : "rgba(255, 197, 0, 0.88)";
  const modePressedUnselected =
    scheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255, 197, 0, 0.14)";
  const modeSelectedFg = MiningSentryColors.black;
  const stopEnabled = transport === "ble" && ble.isScanning;
  const stopBg =
    scheme === "dark" ? "rgba(229, 62, 62, 0.18)" : "rgba(197, 48, 48, 0.12)";
  const stopBorder = palette.error;
  const stopLabelColor = stopEnabled ? palette.error : palette.icon;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: screenBg }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <MiningSentryBrandHeader subtitle="Configure connection" />

        <View style={styles.row}>
          <Pressable
            onPress={() => applyTransport("usb")}
            style={({ pressed }) => {
              const selected = transport === "usb";
              return [
                styles.modeBtn,
                {
                  borderColor: palette.primary,
                  backgroundColor: selected
                    ? modeSelectedBg
                    : pressed
                      ? modePressedUnselected
                      : "transparent",
                },
              ];
            }}
          >
            <View style={styles.btnInner}>
              <MaterialIcons
                name="usb"
                size={22}
                color={transport === "usb" ? modeSelectedFg : palette.primary}
              />
              <Text
                style={[
                  styles.modeBtnLabel,
                  {
                    color: transport === "usb" ? modeSelectedFg : palette.text,
                  },
                ]}
              >
                USB
              </Text>
            </View>
          </Pressable>
          <Pressable
            disabled={Platform.OS === "web"}
            onPress={() => applyTransport("ble")}
            style={({ pressed }) => {
              const selected = transport === "ble";
              return [
                styles.modeBtn,
                {
                  borderColor: palette.primary,
                  opacity: Platform.OS === "web" ? 0.45 : 1,
                  backgroundColor: selected
                    ? modeSelectedBg
                    : pressed
                      ? modePressedUnselected
                      : "transparent",
                },
              ];
            }}
          >
            <View style={styles.btnInner}>
              <MaterialIcons
                name="bluetooth"
                size={22}
                color={transport === "ble" ? modeSelectedFg : palette.primary}
              />
              <Text
                style={[
                  styles.modeBtnLabel,
                  {
                    color: transport === "ble" ? modeSelectedFg : palette.text,
                  },
                ]}
              >
                Bluetooth
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pressable
            onPress={() => void onScanDevices()}
            disabled={
              scanBusy ||
              connecting ||
              (transport === "ble" && Platform.OS === "web")
            }
            style={[
              styles.actionBtn,
              {
                borderColor: palette.accent,
                backgroundColor:
                  scheme === "dark"
                    ? "rgba(76, 177, 229, 0.14)"
                    : "rgba(76, 177, 229, 0.2)",
                opacity: scanBusy || connecting ? 0.55 : 1,
              },
            ]}
          >
            {scanBusy ? (
              <View style={styles.btnInner}>
                <ActivityIndicator color={palette.accent} size="small" />
                <ThemedText type="defaultSemiBold" style={styles.scanLabel}>
                  Scanning…
                </ThemedText>
              </View>
            ) : (
              <View style={styles.btnInner}>
                <MaterialIcons
                  name="manage-search"
                  size={22}
                  color={palette.accent}
                />
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: palette.text }}
                >
                  Scan devices
                </ThemedText>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => void onStopScan()}
            disabled={transport === "usb" ? true : !ble.isScanning}
            style={[
              styles.actionBtn,
              {
                borderColor: stopBorder,
                backgroundColor: stopEnabled ? stopBg : palette.card,
                opacity: transport === "usb" || !ble.isScanning ? 0.5 : 1,
              },
            ]}
          >
            <View style={styles.btnInner}>
              <MaterialIcons
                name="stop-circle"
                size={22}
                color={stopLabelColor}
              />
              <Text style={[styles.stopBtnLabel, { color: stopLabelColor }]}>
                Stop scanning
              </Text>
            </View>
          </Pressable>
        </View>

        <ThemedText style={styles.hint}>
          {transport === "usb"
            ? "USB: lists serial devices attached to this tablet. Tap a row to connect."
            : Platform.OS === "web"
              ? "Bluetooth is not available in the web preview."
              : "Bluetooth: discovers nearby BLE modules (e.g. HM-10). Tap a row to connect."}
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.listHeading}>
          Available devices
        </ThemedText>

        {listRows.length === 0 ? (
          <ThemedText style={styles.empty}>
            No devices yet — choose USB or Bluetooth, then tap Scan devices.
          </ThemedText>
        ) : (
          listRows.map((row) => {
            const selected =
              row.kind === "usb"
                ? usb.selectedDeviceId === row.id
                : ble.selectedDeviceId === row.id;
            return (
              <Pressable
                key={row.key}
                disabled={connecting}
                onPress={() => void onDeviceRowPress(row.kind, row.id)}
                style={[
                  styles.deviceRow,
                  {
                    borderColor: selected ? palette.accent : palette.border,
                    backgroundColor: selected
                      ? scheme === "dark"
                        ? "rgba(76, 177, 229, 0.12)"
                        : "rgba(76, 177, 229, 0.14)"
                      : palette.card,
                    opacity: connecting ? 0.65 : 1,
                  },
                ]}
              >
                <ThemedText type="defaultSemiBold">{row.title}</ThemedText>
                <ThemedText style={styles.deviceSub}>{row.sub}</ThemedText>
                {connecting && selected ? (
                  <View style={styles.rowCenter}>
                    <ActivityIndicator size="small" color={palette.accent} />
                    <ThemedText style={styles.connectingLabel}>
                      Connecting…
                    </ThemedText>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}

        {showUsbCard ? (
          <ConfigureConnectionStatusCard
            title={usbCardTitle}
            subtitle={usbCardSubtitle}
            status={usbCardStatus}
            isUsb
            onStopReconnect={onUsbStopReconnect}
            onReconnect={onUsbReconnect}
            onDisconnectSession={onUsbDisconnectSession}
          />
        ) : null}

        {showBleCard ? (
          <ConfigureConnectionStatusCard
            title={bleCardTitle}
            subtitle={bleCardSubtitle}
            status={bleCardStatus}
            isUsb={false}
            onStopReconnect={onBleStopReconnect}
            onReconnect={onBleReconnect}
            onDisconnectSession={onBleDisconnectSession}
          />
        ) : null}
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
    paddingBottom: 28,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  modeBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modeBtnLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  stopBtnLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanLabel: {
    marginLeft: 0,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.78,
    textAlign: "center",
  },
  listHeading: {
    marginTop: 4,
  },
  empty: {
    textAlign: "center",
    opacity: 0.75,
    fontSize: 14,
    paddingVertical: 12,
  },
  deviceRow: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
  },
  deviceSub: {
    fontSize: 12,
    opacity: 0.7,
  },
  connectingLabel: {
    fontSize: 13,
    opacity: 0.85,
  },
});

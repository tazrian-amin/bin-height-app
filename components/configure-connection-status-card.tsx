import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

export type ConfigureConnectionStatusCardProps = {
  title: string;
  subtitle: string;
  status: ConnectionStatus;
  isUsb: boolean;
  onStopReconnect: () => void;
  onReconnect: () => void;
  onDisconnectSession: () => void;
};

export function ConfigureConnectionStatusCard({
  title,
  subtitle,
  status,
  isUsb,
  onStopReconnect,
  onReconnect,
  onDisconnectSession,
}: ConfigureConnectionStatusCardProps) {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  const statusLabel =
    status === "connected"
      ? "Connected"
      : status === "reconnecting"
        ? "Reconnecting…"
        : "Disconnected";

  const statusColor =
    status === "connected"
      ? palette.success
      : status === "reconnecting"
        ? palette.warning
        : palette.icon;

  return (
    <ThemedView variant="card" style={styles.card}>
      <View style={styles.headerRow}>
        <MaterialIcons
          name={isUsb ? "usb" : "bluetooth"}
          size={22}
          color={palette.accent}
        />
        <ThemedText type="subtitle" style={styles.cardTitle}>
          Current device
        </ThemedText>
      </View>

      <ThemedText type="defaultSemiBold" style={styles.deviceName}>
        {title}
      </ThemedText>
      <ThemedText style={styles.deviceSub}>{subtitle}</ThemedText>

      <View style={styles.statusRow}>
        <ThemedText style={styles.statusLabel}>Status:</ThemedText>
        <ThemedText type="defaultSemiBold" style={[styles.statusValue, { color: statusColor }]}>
          {statusLabel}
        </ThemedText>
        {status === "reconnecting" ? (
          <ActivityIndicator size="small" color={palette.warning} style={styles.spinner} />
        ) : null}
      </View>

      {status === "reconnecting" ? (
        <View style={styles.row}>
          <Pressable
            onPress={onStopReconnect}
            style={[styles.btn, styles.btnSecondary, { borderColor: palette.border }]}
          >
            <MaterialIcons name="block" size={20} color={palette.text} />
            <ThemedText type="defaultSemiBold">Stop reconnect</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => void onReconnect()}
            style={[styles.btn, styles.btnPrimary, { borderColor: palette.accent }]}
          >
            <MaterialIcons name="refresh" size={20} color={palette.accent} />
            <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
              Reconnect now
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {status === "disconnected" ? (
        <Pressable
          onPress={() => void onReconnect()}
          style={[styles.btn, styles.btnPrimary, styles.btnFull, { borderColor: palette.accent }]}
        >
          <MaterialIcons name="refresh" size={20} color={palette.accent} />
          <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
            Reconnect
          </ThemedText>
        </Pressable>
      ) : null}

      <Pressable
        onPress={onDisconnectSession}
        style={[styles.btn, styles.btnDanger, { borderColor: palette.error }]}
      >
        <MaterialIcons name="link-off" size={20} color={palette.error} />
        <ThemedText type="defaultSemiBold" style={{ color: palette.error }}>
          Disconnect
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
  },
  deviceSub: {
    fontSize: 12,
    opacity: 0.72,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  statusLabel: {
    opacity: 0.85,
  },
  statusValue: {},
  spinner: {
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 44,
  },
  btnFull: {
    flex: 1,
    alignSelf: "stretch",
  },
  btnPrimary: {
    backgroundColor: "transparent",
  },
  btnSecondary: {
    backgroundColor: "transparent",
  },
  btnDanger: {
    marginTop: 4,
    backgroundColor: "transparent",
  },
});

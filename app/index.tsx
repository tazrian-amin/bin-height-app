import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LatestAdcCard } from "@/components/home/latest-adc-card";
import { UsbSerialCard } from "@/components/home/usb-serial-card";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUsbAdcSerial } from "@/hooks/use-usb-adc-serial";

export default function HomeScreen() {
  const serial = useUsbAdcSerial();
  const screenBg = useThemeColor({}, "background");

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: screenBg }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <UsbSerialCard
          devices={serial.devices}
          selectedDeviceId={serial.selectedDeviceId}
          isConnecting={serial.isConnecting}
          isConnected={serial.isConnected}
          isReconnecting={serial.isReconnecting}
          onRefreshDevices={() => void serial.refreshDevices()}
          onConnect={() => void serial.connect()}
          onDisconnect={serial.disconnect}
          onCancelAutoReconnect={serial.cancelAutoReconnect}
        />
        <LatestAdcCard latestAdc={serial.latestAdc} />
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
  },
});

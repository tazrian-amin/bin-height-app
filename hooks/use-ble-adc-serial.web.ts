import { useCallback, useState } from "react";

import type { BleDiscoveredDevice } from "@/hooks/ble-adc-types";

export function useBleAdcSerial() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [discoveredDevices] = useState<BleDiscoveredDevice[]>([]);

  const noopAsync = useCallback(async () => {}, []);
  const noopConnectId = useCallback(async (_deviceId: string) => {}, []);

  return {
    discoveredDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    isScanning: false,
    isConnecting: false,
    isConnected: false,
    isReconnecting: false,
    latestAdc: null as number | null,
    startScan: noopAsync,
    stopScan: noopAsync,
    connect: noopAsync,
    connectToDeviceId: noopConnectId,
    disconnect: noopAsync,
    cancelAutoReconnect: noopAsync,
  };
}

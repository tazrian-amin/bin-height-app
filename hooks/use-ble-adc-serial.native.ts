import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, NativeModules, PermissionsAndroid, Platform } from "react-native";
import {
  BleManager,
  State,
  type BleError,
  type Subscription,
} from "react-native-ble-plx";

import { HM10_BLE_DATA_CHAR_UUID, HM10_BLE_SERVICE_UUID } from "@/constants/hm10-ble";
import { useAdcDatabase } from "@/contexts/adc-database-context";
import type { BleDiscoveredDevice } from "@/hooks/ble-adc-types";
import { bleBase64ToAscii } from "@/utils/ble-base64";
import { parseLastAdcValueInText } from "@/utils/usb-serial-adc";

const RX_BUFFER_MAX = 4096;
const UI_FLUSH_MS = 48;
const PERSIST_DEBOUNCE_MS = 350;
const SCAN_AUTO_STOP_MS = 12_000;
const RECONNECT_DELAYS_MS = [1200, 2500, 5000, 10_000, 20_000, 30_000];

let sharedManager: BleManager | null = null;

/** `BleManager` ctor calls `NativeModules.BlePlx.createClient()` — absent in Expo Go, etc. */
function isBlePlxNativeAvailable(): boolean {
  const m = NativeModules.BlePlx as { createClient?: unknown } | null | undefined;
  return m != null && typeof m.createClient === "function";
}

function getManager(): BleManager | null {
  if (!isBlePlxNativeAvailable()) return null;
  if (sharedManager == null) {
    try {
      sharedManager = new BleManager();
    } catch {
      sharedManager = null;
      return null;
    }
  }
  return sharedManager;
}

function bleErrorMessage(err: unknown): string {
  if (err != null && typeof err === "object" && "message" in err) {
    const m = (err as BleError).message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  return err instanceof Error ? err.message : String(err);
}

async function ensureBlePermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const raw = Platform.Version;
  const api = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (api >= 31) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    const scanOk =
      granted["android.permission.BLUETOOTH_SCAN"] === PermissionsAndroid.RESULTS.GRANTED;
    const connOk =
      granted["android.permission.BLUETOOTH_CONNECT"] ===
      PermissionsAndroid.RESULTS.GRANTED;
    if (!scanOk || !connOk) {
      Alert.alert(
        "Bluetooth permissions",
        "Scan and connect permissions are required to use BLE.",
      );
      return false;
    }
    return true;
  }
  const loc = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  if (loc !== PermissionsAndroid.RESULTS.GRANTED) {
    Alert.alert(
      "Location permission",
      "Android requires location access for BLE scans on this OS version.",
    );
    return false;
  }
  return true;
}

async function waitUntilPoweredOn(manager: BleManager): Promise<boolean> {
  try {
    const s = await manager.state();
    if (s === State.PoweredOn) return true;
    if (s === State.Unsupported) {
      Alert.alert("Bluetooth", "Bluetooth LE is not supported on this device.");
      return false;
    }
    if (s === State.Unauthorized) {
      Alert.alert("Bluetooth", "Bluetooth access was denied for this app.");
      return false;
    }
    if (s === State.PoweredOff && Platform.OS === "android") {
      Alert.alert("Bluetooth", "Turn Bluetooth on, then try again.");
      return false;
    }
    return await new Promise((resolve) => {
      const tOut = setTimeout(() => {
        sub.remove();
        Alert.alert("Bluetooth", "Timed out waiting for Bluetooth to power on.");
        resolve(false);
      }, 12_000);
      const sub = manager.onStateChange((next) => {
        if (next === State.PoweredOn) {
          clearTimeout(tOut);
          sub.remove();
          resolve(true);
        }
        if (next === State.Unsupported || next === State.Unauthorized) {
          clearTimeout(tOut);
          sub.remove();
          resolve(false);
        }
      }, true);
    });
  } catch (e) {
    Alert.alert("Bluetooth", bleErrorMessage(e));
    return false;
  }
}

export function useBleAdcSerial() {
  const adcDb = useAdcDatabase();
  const adcDbRef = useRef(adcDb);
  adcDbRef.current = adcDb;

  const [discoveredDevices, setDiscoveredDevices] = useState<BleDiscoveredDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [latestAdc, setLatestAdc] = useState<number | null>(null);

  const selectedDeviceIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
  }, [selectedDeviceId]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  const mountedRef = useRef(true);
  const rowMapRef = useRef(new Map<string, BleDiscoveredDevice>());
  const scanStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monitorSubRef = useRef<Subscription | null>(null);
  const disconnectSubRef = useRef<Subscription | null>(null);
  const connectedDeviceIdRef = useRef<string | null>(null);
  const rxBufferRef = useRef("");
  const userStoppedSessionRef = useRef(true);
  const userInitiatedDisconnectRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSessionBleIdRef = useRef<string | null>(null);
  const isConnectedRef = useRef(false);

  const uiPendingRef = useRef<number | null>(null);
  const uiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistLatestRef = useRef<number | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushUi = useCallback(() => {
    uiTimerRef.current = null;
    const v = uiPendingRef.current;
    uiPendingRef.current = null;
    if (v == null || !mountedRef.current) return;
    setLatestAdc((prev) => (prev === v ? prev : v));
  }, []);

  const scheduleUiUpdate = useCallback(
    (adc: number) => {
      uiPendingRef.current = adc;
      if (uiTimerRef.current != null) return;
      uiTimerRef.current = setTimeout(flushUi, UI_FLUSH_MS);
    },
    [flushUi],
  );

  const flushPersist = useCallback(() => {
    persistTimerRef.current = null;
    const v = persistLatestRef.current;
    persistLatestRef.current = null;
    if (v == null || !mountedRef.current) return;
    void adcDbRef.current.insertReading(v).catch(() => {});
  }, []);

  const schedulePersist = useCallback(
    (adc: number) => {
      persistLatestRef.current = adc;
      if (persistTimerRef.current != null) {
        clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = setTimeout(flushPersist, PERSIST_DEBOUNCE_MS);
    },
    [flushPersist],
  );

  const clearSerialTimers = useCallback(() => {
    if (uiTimerRef.current != null) {
      clearTimeout(uiTimerRef.current);
      uiTimerRef.current = null;
    }
    uiPendingRef.current = null;
    if (persistTimerRef.current != null) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    persistLatestRef.current = null;
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current != null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const cancelAutoReconnect = useCallback(() => {
    userStoppedSessionRef.current = true;
    activeSessionBleIdRef.current = null;
    clearReconnectTimer();
    setIsReconnecting(false);
    reconnectAttemptRef.current = 0;
  }, [clearReconnectTimer]);

  const stopScanInner = useCallback(async () => {
    if (scanStopTimerRef.current != null) {
      clearTimeout(scanStopTimerRef.current);
      scanStopTimerRef.current = null;
    }
    try {
      await getManager()?.stopDeviceScan();
    } catch {
      // ignore
    }
    if (mountedRef.current) {
      setIsScanning(false);
    }
  }, []);

  const startScan = useCallback(async () => {
    const manager = getManager();
    if (manager == null) {
      Alert.alert(
        "Bluetooth not available",
        "BLE needs a native build with react-native-ble-plx. Use a Dev Client from `npx expo run:android` or `npx expo run:ios` — not Expo Go.",
      );
      return;
    }
    const powered = await waitUntilPoweredOn(manager);
    if (!powered) return;
    const ok = await ensureBlePermissions();
    if (!ok) return;

    await stopScanInner();
    rowMapRef.current = new Map();
    if (mountedRef.current) {
      setDiscoveredDevices([]);
    }

    if (scanStopTimerRef.current != null) {
      clearTimeout(scanStopTimerRef.current);
    }
    scanStopTimerRef.current = setTimeout(() => {
      void stopScanInner();
    }, SCAN_AUTO_STOP_MS);

    if (mountedRef.current) {
      setIsScanning(true);
    }

    try {
      await manager.startDeviceScan(null, null, (error, device) => {
        if (error != null) {
          void stopScanInner();
          if (mountedRef.current) {
            Alert.alert("BLE scan failed", bleErrorMessage(error));
          }
          return;
        }
        if (device == null) return;
        const name = device.name ?? device.localName ?? null;
        rowMapRef.current.set(device.id, { id: device.id, name });
        const next = Array.from(rowMapRef.current.values()).sort((a, b) => {
          const an = a.name ?? "";
          const bn = b.name ?? "";
          if (an !== bn) return an.localeCompare(bn);
          return a.id.localeCompare(b.id);
        });
        if (mountedRef.current) {
          setDiscoveredDevices(next);
        }
      });
    } catch (e) {
      await stopScanInner();
      if (mountedRef.current) {
        Alert.alert("BLE scan failed", bleErrorMessage(e));
      }
    }
  }, [stopScanInner]);

  const stopScan = useCallback(async () => {
    await stopScanInner();
  }, [stopScanInner]);

  const establishBleConnectionRef = useRef<
    ((id: string, opts?: { silent?: boolean; fromAutoReconnect?: boolean }) => Promise<void>) | null
  >(null);

  const scheduleBleReconnectAttemptRef = useRef<() => void>(() => {});

  const scheduleBleReconnectAttempt = useCallback(() => {
    if (userStoppedSessionRef.current) return;
    if (reconnectTimerRef.current != null) return;
    const id = activeSessionBleIdRef.current;
    if (id == null) return;
    if (isConnectedRef.current) return;

    setIsReconnecting(true);

    const idx = Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS_MS.length - 1);
    const delay = RECONNECT_DELAYS_MS[idx]!;

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      if (!mountedRef.current || userStoppedSessionRef.current) return;
      if (isConnectedRef.current) return;

      void (async () => {
        reconnectAttemptRef.current += 1;
        const target = activeSessionBleIdRef.current;
        if (target == null) {
          setIsReconnecting(false);
          return;
        }

        const connectFn = establishBleConnectionRef.current;
        if (connectFn == null) return;
        await connectFn(target, { silent: true, fromAutoReconnect: true });
        if (isConnectedRef.current) {
          reconnectAttemptRef.current = 0;
          setIsReconnecting(false);
          return;
        }
        if (!userStoppedSessionRef.current && !isConnectedRef.current) {
          scheduleBleReconnectAttemptRef.current();
        }
      })();
    }, delay);
  }, []);

  useEffect(() => {
    scheduleBleReconnectAttemptRef.current = scheduleBleReconnectAttempt;
  }, [scheduleBleReconnectAttempt]);

  const handleBleLinkLost = useCallback(() => {
    if (userStoppedSessionRef.current) return;
    reconnectAttemptRef.current = 0;
    clearReconnectTimer();
    setIsReconnecting(true);
    scheduleBleReconnectAttempt();
  }, [clearReconnectTimer, scheduleBleReconnectAttempt]);

  const disconnect = useCallback(async () => {
    userStoppedSessionRef.current = true;
    activeSessionBleIdRef.current = null;
    clearReconnectTimer();
    setIsReconnecting(false);
    reconnectAttemptRef.current = 0;

    await stopScanInner();
    const pendingSave = persistLatestRef.current;
    clearSerialTimers();
    if (pendingSave != null) {
      void adcDbRef.current.insertReading(pendingSave).catch(() => {});
    }
    try {
      monitorSubRef.current?.remove();
    } catch {
      // ignore
    } finally {
      monitorSubRef.current = null;
    }
    try {
      disconnectSubRef.current?.remove();
    } catch {
      // ignore
    } finally {
      disconnectSubRef.current = null;
    }
    const id = connectedDeviceIdRef.current;
    connectedDeviceIdRef.current = null;
    rxBufferRef.current = "";
    if (id != null) {
      userInitiatedDisconnectRef.current = true;
      try {
        await getManager()?.cancelDeviceConnection(id);
      } catch {
        // ignore
      } finally {
        userInitiatedDisconnectRef.current = false;
      }
    }
    if (mountedRef.current) {
      setIsConnected(false);
      isConnectedRef.current = false;
    }
  }, [clearReconnectTimer, clearSerialTimers, stopScanInner]);

  const establishBleConnection = useCallback(
    async (
      id: string,
      opts?: { silent?: boolean; fromAutoReconnect?: boolean },
    ) => {
      const silent = opts?.silent ?? false;
      const fromAutoReconnect = opts?.fromAutoReconnect ?? false;
      const manager = getManager();
      if (manager == null) {
        if (mountedRef.current && !silent) {
          Alert.alert(
            "Bluetooth not available",
            "BLE needs a native build with react-native-ble-plx. Use a Dev Client from `npx expo run:android` or `npx expo run:ios` — not Expo Go.",
          );
        }
        if (fromAutoReconnect && mountedRef.current) {
          clearReconnectTimer();
          setIsReconnecting(false);
        }
        return;
      }
      const powered = await waitUntilPoweredOn(manager);
      if (!powered) return;
      const perm = await ensureBlePermissions();
      if (!perm) return;

      if (!fromAutoReconnect) {
        clearReconnectTimer();
        setIsReconnecting(false);
        reconnectAttemptRef.current = 0;
      }

      await stopScanInner();
      if (!fromAutoReconnect) {
        setIsConnecting(true);
      } else {
        setIsConnecting(false);
      }
      try {
        const dev = await manager.connectToDevice(id);
        await dev.discoverAllServicesAndCharacteristics();
        connectedDeviceIdRef.current = id;
        activeSessionBleIdRef.current = id;
        rxBufferRef.current = "";
        userStoppedSessionRef.current = false;
        reconnectAttemptRef.current = 0;
        setIsReconnecting(false);
        clearReconnectTimer();

        disconnectSubRef.current = dev.onDisconnected(() => {
          if (!mountedRef.current) return;
          const userDrove = userInitiatedDisconnectRef.current;
          userInitiatedDisconnectRef.current = false;

          try {
            monitorSubRef.current?.remove();
          } catch {
            // ignore
          } finally {
            monitorSubRef.current = null;
          }
          try {
            disconnectSubRef.current?.remove();
          } catch {
            // ignore
          } finally {
            disconnectSubRef.current = null;
          }
          connectedDeviceIdRef.current = null;
          clearSerialTimers();
          setIsConnected(false);
          isConnectedRef.current = false;

          if (userDrove || userStoppedSessionRef.current) {
            setIsReconnecting(false);
            return;
          }

          if (activeSessionBleIdRef.current == null) {
            activeSessionBleIdRef.current = id;
          }
          handleBleLinkLost();
        });

        monitorSubRef.current = dev.monitorCharacteristicForService(
          HM10_BLE_SERVICE_UUID,
          HM10_BLE_DATA_CHAR_UUID,
          (err, characteristic) => {
            if (err != null) {
              return;
            }
            const b64 = characteristic?.value;
            if (b64 == null) return;
            const chunk = bleBase64ToAscii(b64);
            if (!chunk) return;
            rxBufferRef.current += chunk;
            if (rxBufferRef.current.length > RX_BUFFER_MAX) {
              rxBufferRef.current = rxBufferRef.current.slice(-RX_BUFFER_MAX);
            }
            const adc = parseLastAdcValueInText(rxBufferRef.current);
            if (adc == null) return;
            scheduleUiUpdate(adc);
            schedulePersist(adc);
          },
        );

        if (mountedRef.current) {
          setIsConnected(true);
          isConnectedRef.current = true;
        }
      } catch (e) {
        try {
          monitorSubRef.current?.remove();
        } catch {
          // ignore
        } finally {
          monitorSubRef.current = null;
        }
        try {
          disconnectSubRef.current?.remove();
        } catch {
          // ignore
        } finally {
          disconnectSubRef.current = null;
        }
        connectedDeviceIdRef.current = null;
        rxBufferRef.current = "";
        if (mountedRef.current) {
          setIsConnected(false);
          isConnectedRef.current = false;
          if (!silent) {
            Alert.alert("BLE connect failed", bleErrorMessage(e));
          }
        }
      } finally {
        if (mountedRef.current && !fromAutoReconnect) {
          setIsConnecting(false);
        }
      }
    },
    [
      clearReconnectTimer,
      clearSerialTimers,
      handleBleLinkLost,
      schedulePersist,
      scheduleUiUpdate,
      stopScanInner,
    ],
  );

  useEffect(() => {
    establishBleConnectionRef.current = establishBleConnection;
  }, [establishBleConnection]);

  const connect = useCallback(async () => {
    const id = selectedDeviceIdRef.current;
    if (id == null) {
      Alert.alert(
        "No device selected",
        "Run a scan, tap your HM-10/JDY module in the list, then tap Connect.",
      );
      return;
    }
    userStoppedSessionRef.current = false;
    await establishBleConnection(id);
  }, [establishBleConnection]);

  const connectToDeviceId = useCallback(
    async (deviceId: string) => {
      userStoppedSessionRef.current = false;
      setSelectedDeviceId(deviceId);
      selectedDeviceIdRef.current = deviceId;
      await establishBleConnection(deviceId);
    },
    [establishBleConnection],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void disconnect();
    };
  }, [disconnect]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const latest = await adcDb.getLatestValue();
        if (!cancelled && latest != null) {
          setLatestAdc(latest);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adcDb]);

  return {
    discoveredDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    isScanning,
    isConnecting,
    isConnected,
    isReconnecting,
    latestAdc,
    startScan,
    stopScan,
    connect,
    connectToDeviceId,
    disconnect,
    cancelAutoReconnect,
  };
}

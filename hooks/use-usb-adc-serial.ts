import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, type AppStateStatus, Platform } from "react-native";

import { useAdcDatabase } from "@/contexts/adc-database-context";
import {
  getUsbSerial,
  parseLastAdcValueInText,
  serialPayloadToText,
  type UsbDevice,
  type UsbSerialPort,
} from "@/utils/usb-serial-adc";

const RX_BUFFER_MAX = 4096;
const UI_FLUSH_MS = 48;
const PERSIST_DEBOUNCE_MS = 350;

/** No serial payload for this long while “connected” → treat as dropped link (loose cable, etc.). */
const RX_STALE_MS = 20_000;
/** How often we check RX age and USB device presence. */
const WATCHDOG_INTERVAL_MS = 4000;
/** Delays between automatic reconnect attempts (exponential cap). */
const RECONNECT_DELAYS_MS = [1200, 2500, 5000, 10_000, 20_000, 30_000];

type UsbSerialManagerApi = {
  list: () => Promise<UsbDevice[]>;
  tryRequestPermission: (id: number) => Promise<unknown>;
  open: (
    id: number,
    opts: { baudRate: number; parity: number; dataBits: number; stopBits: number },
  ) => Promise<UsbSerialPort>;
};

export function useUsbAdcSerial() {
  const adcDb = useAdcDatabase();
  const adcDbRef = useRef(adcDb);
  adcDbRef.current = adcDb;

  const [devices, setDevices] = useState<UsbDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [latestAdc, setLatestAdc] = useState<number | null>(null);

  const portRef = useRef<UsbSerialPort | null>(null);
  const unsubscribeRef = useRef<{ remove: () => void } | null>(null);
  const rxBufferRef = useRef("");
  const mountedRef = useRef(true);
  const selectedDeviceIdRef = useRef<number | null>(null);
  selectedDeviceIdRef.current = selectedDeviceId;

  const isConnectedRef = useRef(false);
  const isConnectingRef = useRef(false);
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);
  useEffect(() => {
    isConnectingRef.current = isConnecting;
  }, [isConnecting]);

  /** USB device id used for the active session (watchdog / auto-reconnect). */
  const activeSessionDeviceIdRef = useRef<number | null>(null);
  /** User tapped Disconnect — do not auto-reconnect until they connect again. */
  const userStoppedSessionRef = useRef(true);
  const lastRxAtRef = useRef(0);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogListInFlightRef = useRef(false);
  /** True while `open` / permission is in flight (including silent auto-reconnect). */
  const openingPortRef = useRef(false);

  const uiPendingRef = useRef<number | null>(null);
  const uiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistLatestRef = useRef<number | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current != null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

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

  /** Close port and clear UI timers; does not change user-stopped flag. */
  const closeSerialSession = useCallback(() => {
    const pendingSave = persistLatestRef.current;
    clearSerialTimers();
    if (pendingSave != null) {
      void adcDbRef.current.insertReading(pendingSave).catch(() => {});
    }
    try {
      unsubscribeRef.current?.remove();
    } catch {
      // ignore
    } finally {
      unsubscribeRef.current = null;
    }

    try {
      void portRef.current?.close();
    } catch {
      // ignore
    } finally {
      portRef.current = null;
    }

    rxBufferRef.current = "";
    setIsConnected(false);
    setIsConnecting(false);
    isConnectedRef.current = false;
    isConnectingRef.current = false;
  }, [clearSerialTimers]);

  /** Stop automatic reconnect attempts (link lost or still trying). */
  const cancelAutoReconnect = useCallback(() => {
    userStoppedSessionRef.current = true;
    activeSessionDeviceIdRef.current = null;
    clearReconnectTimer();
    setIsReconnecting(false);
    reconnectAttemptRef.current = 0;
  }, [clearReconnectTimer]);

  const disconnect = useCallback(() => {
    userStoppedSessionRef.current = true;
    activeSessionDeviceIdRef.current = null;
    clearReconnectTimer();
    setIsReconnecting(false);
    reconnectAttemptRef.current = 0;
    closeSerialSession();
  }, [clearReconnectTimer, closeSerialSession]);

  const refreshDevices = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (Platform.OS !== "android") {
      if (!silent) {
        Alert.alert(
          "Android only",
          "USB serial is only supported on Android for this app.",
        );
      }
      return;
    }
    const usb = getUsbSerial();
    const UsbSerialManager = usb?.UsbSerialManager as UsbSerialManagerApi | undefined;
    if (!UsbSerialManager) {
      if (!silent) {
        Alert.alert(
          "USB serial not available",
          "This requires a native build (Expo Dev Client). Run `npx expo run:android` and open the Dev Client app—not Expo Go.",
        );
      }
      return;
    }
    try {
      const list = await UsbSerialManager.list();
      setDevices(list);
      if (list.length > 0 && selectedDeviceIdRef.current == null) {
        setSelectedDeviceId(list[0].deviceId);
      }
    } catch (e: unknown) {
      if (!silent) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert("Failed to list USB devices", msg);
      }
    }
  }, []);

  const attachReceiveHandler = useCallback(
    (port: UsbSerialPort) => {
      unsubscribeRef.current = port.onReceived((event: { data?: unknown }) => {
        const chunk = serialPayloadToText(event?.data);
        if (chunk) {
          lastRxAtRef.current = Date.now();
        }
        if (!chunk) return;

        rxBufferRef.current += chunk;
        if (rxBufferRef.current.length > RX_BUFFER_MAX) {
          rxBufferRef.current = rxBufferRef.current.slice(-RX_BUFFER_MAX);
        }

        const adc = parseLastAdcValueInText(rxBufferRef.current);
        if (adc == null) return;

        scheduleUiUpdate(adc);
        schedulePersist(adc);
      });
    },
    [schedulePersist, scheduleUiUpdate],
  );

  const openPortForDevice = useCallback(
    async (
      deviceId: number,
      options?: { silent?: boolean; fromAutoReconnect?: boolean },
    ): Promise<boolean> => {
      const silent = options?.silent ?? false;
      const fromAutoReconnect = options?.fromAutoReconnect ?? false;
      if (Platform.OS !== "android") return false;

      const usb = getUsbSerial();
      const UsbSerialManager = usb?.UsbSerialManager as UsbSerialManagerApi | undefined;
      const Codes = usb?.Codes as { DEVICE_NOT_FOND?: string } | undefined;
      const Parity = usb?.Parity as { None?: number } | undefined;

      if (!UsbSerialManager) {
        if (!silent) {
          Alert.alert(
            "USB serial not available",
            "This requires a native build (Expo Dev Client). Run `npx expo run:android` and open the Dev Client app—not Expo Go.",
          );
        }
        return false;
      }

      openingPortRef.current = true;
      if (!fromAutoReconnect) {
        setIsConnecting(true);
        isConnectingRef.current = true;
      }
      rxBufferRef.current = "";
      clearSerialTimers();

      try {
        await UsbSerialManager.tryRequestPermission(deviceId);

        const port = await UsbSerialManager.open(deviceId, {
          baudRate: 9600,
          parity: Parity?.None ?? 0,
          dataBits: 8,
          stopBits: 1,
        });

        portRef.current = port;
        attachReceiveHandler(port);
        setIsConnected(true);
        isConnectedRef.current = true;
        lastRxAtRef.current = Date.now();
        activeSessionDeviceIdRef.current = deviceId;
        userStoppedSessionRef.current = false;
        reconnectAttemptRef.current = 0;
        return true;
      } catch (err: unknown) {
        closeSerialSession();

        const code =
          err && typeof err === "object" && "code" in err
            ? (err as { code?: string }).code
            : undefined;
        if (!silent) {
          if (code === Codes?.DEVICE_NOT_FOND) {
            Alert.alert(
              "USB device not found",
              'Unplug/replug the MCU, then tap "Refresh devices".',
            );
          } else {
            const msg = err instanceof Error ? err.message : String(err);
            Alert.alert("Failed to connect", msg);
          }
        }
        return false;
      } finally {
        openingPortRef.current = false;
        if (!fromAutoReconnect) {
          setIsConnecting(false);
          isConnectingRef.current = false;
        }
      }
    },
    [attachReceiveHandler, clearSerialTimers, closeSerialSession],
  );

  const connect = useCallback(async () => {
    if (Platform.OS !== "android") return;
    clearReconnectTimer();
    setIsReconnecting(false);
    reconnectAttemptRef.current = 0;
    userStoppedSessionRef.current = false;

    if (selectedDeviceId == null) {
      Alert.alert(
        "No device selected",
        'Plug in your MCU and tap "Refresh devices".',
      );
      return;
    }

    await openPortForDevice(selectedDeviceId, { silent: false });
  }, [clearReconnectTimer, openPortForDevice, selectedDeviceId]);

  /** Opens the port for a specific device id (for tap-to-connect without waiting on React state). */
  const connectToDeviceId = useCallback(
    async (deviceId: number) => {
      if (Platform.OS !== "android") return;
      clearReconnectTimer();
      setIsReconnecting(false);
      reconnectAttemptRef.current = 0;
      userStoppedSessionRef.current = false;
      setSelectedDeviceId(deviceId);
      await openPortForDevice(deviceId, { silent: false });
    },
    [clearReconnectTimer, openPortForDevice],
  );

  const scheduleReconnectAttempt = useCallback(() => {
    if (Platform.OS !== "android") return;
    if (userStoppedSessionRef.current) return;
    if (reconnectTimerRef.current != null) return;
    if (activeSessionDeviceIdRef.current == null) return;
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
        const deviceId = activeSessionDeviceIdRef.current;
        if (deviceId == null) {
          setIsReconnecting(false);
          return;
        }

        await refreshDevices({ silent: true });

        const ok = await openPortForDevice(deviceId, {
          silent: true,
          fromAutoReconnect: true,
        });
        if (ok) {
          reconnectAttemptRef.current = 0;
          setIsReconnecting(false);
          return;
        }

        if (!userStoppedSessionRef.current && !isConnectedRef.current) {
          scheduleReconnectAttempt();
        }
      })();
    }, delay);
  }, [openPortForDevice, refreshDevices]);

  const handleLinkLost = useCallback(() => {
    if (userStoppedSessionRef.current) return;
    reconnectAttemptRef.current = 0;
    setIsReconnecting(true);
    closeSerialSession();
    scheduleReconnectAttempt();
  }, [closeSerialSession, scheduleReconnectAttempt]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const latest = await adcDb.getLatestValue();
        if (!cancelled && latest != null) setLatestAdc(latest);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adcDb]);

  useEffect(() => {
    void refreshDevices({ silent: true });
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Foreground: nudge a reconnect soon after resume. */
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next !== "active") return;
      if (userStoppedSessionRef.current) return;
      if (isConnectedRef.current) return;
      if (activeSessionDeviceIdRef.current == null) return;
      reconnectAttemptRef.current = 0;
      clearReconnectTimer();
      scheduleReconnectAttempt();
    });
    return () => sub.remove();
  }, [clearReconnectTimer, scheduleReconnectAttempt]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const tick = () => {
      if (userStoppedSessionRef.current) return;
      if (openingPortRef.current) return;
      if (isConnectingRef.current) return;

      if (isConnectedRef.current) {
        const stale = Date.now() - lastRxAtRef.current > RX_STALE_MS;
        if (stale) {
          handleLinkLost();
          return;
        }

        if (watchdogListInFlightRef.current) return;
        watchdogListInFlightRef.current = true;
        void (async () => {
          try {
            const usb = getUsbSerial();
            const UsbSerialManager = usb?.UsbSerialManager as
              | UsbSerialManagerApi
              | undefined;
            const id = activeSessionDeviceIdRef.current;
            if (!UsbSerialManager || id == null) return;
            const list = await UsbSerialManager.list();
            const present = list.some((d) => d.deviceId === id);
            if (!present && isConnectedRef.current) {
              handleLinkLost();
            }
          } catch {
            // ignore
          } finally {
            watchdogListInFlightRef.current = false;
          }
        })();
        return;
      }

      if (
        !isConnectedRef.current &&
        !userStoppedSessionRef.current &&
        activeSessionDeviceIdRef.current != null
      ) {
        scheduleReconnectAttempt();
      }
    };

    const id = setInterval(tick, WATCHDOG_INTERVAL_MS);
    return () => clearInterval(id);
  }, [handleLinkLost, scheduleReconnectAttempt]);

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isConnecting,
    isConnected,
    isReconnecting,
    latestAdc,
    refreshDevices,
    connect,
    connectToDeviceId,
    disconnect,
    cancelAutoReconnect,
  };
}

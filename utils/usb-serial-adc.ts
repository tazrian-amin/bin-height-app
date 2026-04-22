import { Platform } from "react-native";

export type UsbSerialPort = {
  onReceived: (cb: (event: { data?: unknown }) => void) => { remove: () => void };
  send: (data: string) => Promise<void> | void;
  close: () => Promise<void> | void;
};

export type UsbDevice = {
  deviceId: number;
  deviceName?: string;
  productName?: string;
  vendorId?: number;
  productId?: number;
};

export function getUsbSerial(): Record<string, unknown> | null {
  if (Platform.OS !== "android") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-usb-serialport-for-android");
    return (mod ?? null) as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

/**
 * react-native-usb-serialport-for-android sends `event.data` as **hex** (see
 * UsbSerialPortWrapper.java: bytesToHex), not plain text.
 */
export function hexToAscii(hex: string): string {
  const clean = String(hex ?? "").replace(/\s/g, "");
  if (!clean || clean.length % 2 !== 0) return "";
  let out = "";
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) return "";
    out += String.fromCharCode(byte);
  }
  return out;
}

/** If payload is all hex (even length), decode; otherwise treat as text. */
export function serialPayloadToText(data: unknown): string {
  const s = String(data ?? "").trim();
  if (!s) return "";
  if (/^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0) {
    return hexToAscii(s);
  }
  return s;
}

/** Last occurrence wins (multiple lines / repeated sends). */
export function parseLastAdcValueInText(text: string): number | null {
  const matches = [...text.matchAll(/ADC value\s*:\s*(\d+)/gi)];
  if (matches.length === 0) return null;
  const n = Number(matches[matches.length - 1][1]);
  return Number.isFinite(n) ? n : null;
}

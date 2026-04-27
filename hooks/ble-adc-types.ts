export type BleDiscoveredDevice = {
  id: string;
  name: string | null;
};

export type DisplayTransport = "usb" | "ble";

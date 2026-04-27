import React, { createContext, useContext, useState, type ReactNode } from "react";

import type { DisplayTransport } from "@/hooks/ble-adc-types";
import { useBleAdcSerial } from "@/hooks/use-ble-adc-serial";
import { useUsbAdcSerial } from "@/hooks/use-usb-adc-serial";

export type BinHeightTransportContextValue = {
  usb: ReturnType<typeof useUsbAdcSerial>;
  ble: ReturnType<typeof useBleAdcSerial>;
  displaySource: DisplayTransport;
  setDisplaySource: (source: DisplayTransport) => void;
  displayLatestAdc: number | null;
};

const BinHeightTransportContext = createContext<BinHeightTransportContextValue | null>(
  null,
);

export function BinHeightTransportProvider({ children }: { children: ReactNode }) {
  const usb = useUsbAdcSerial();
  const ble = useBleAdcSerial();
  const [displaySource, setDisplaySource] = useState<DisplayTransport>("usb");

  const displayLatestAdc =
    displaySource === "usb" ? usb.latestAdc : ble.latestAdc;

  const value: BinHeightTransportContextValue = {
    usb,
    ble,
    displaySource,
    setDisplaySource,
    displayLatestAdc,
  };

  return (
    <BinHeightTransportContext.Provider value={value}>
      {children}
    </BinHeightTransportContext.Provider>
  );
}

export function useBinHeightTransport(): BinHeightTransportContextValue {
  const ctx = useContext(BinHeightTransportContext);
  if (ctx == null) {
    throw new Error("useBinHeightTransport must be used within BinHeightTransportProvider");
  }
  return ctx;
}

import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

export type AdcDatabaseApi = {
  insertReading(value: number): Promise<void>;
  getLatestValue(): Promise<number | null>;
};

export const AdcDatabaseContext = createContext<AdcDatabaseApi | null>(null);

export function useAdcDatabase(): AdcDatabaseApi {
  const ctx = useContext(AdcDatabaseContext);
  if (ctx == null) {
    throw new Error("useAdcDatabase must be used within AdcStorageRoot");
  }
  return ctx;
}

export function MemoryAdcStorageProvider({ children }: { children: ReactNode }) {
  const readings = useRef<{ value: number }[]>([]);

  const api = useMemo<AdcDatabaseApi>(
    () => ({
      async insertReading(value: number) {
        readings.current.push({ value });
      },
      async getLatestValue() {
        const last = readings.current.at(-1);
        return last?.value ?? null;
      },
    }),
    [],
  );

  return (
    <AdcDatabaseContext.Provider value={api}>{children}</AdcDatabaseContext.Provider>
  );
}

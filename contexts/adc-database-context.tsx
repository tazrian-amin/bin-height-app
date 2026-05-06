import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

export type AdcReading = {
  value: number;
  createdAt: number;
};

export type AdcDatabaseApi = {
  insertReading(value: number): Promise<void>;
  getLatestValue(): Promise<number | null>;
  /**
   * Returns most-recent-first or oldest-first depending on `order`.
   * Intended for lightweight, on-device charting.
   */
  listRecentReadings(options?: {
    /** Max rows to return (default 120). */
    limit?: number;
    /** If set, only include readings with createdAt >= sinceMs. */
    sinceMs?: number;
    /** Sort order for returned rows (default "asc"). */
    order?: "asc" | "desc";
  }): Promise<AdcReading[]>;
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
  const readings = useRef<AdcReading[]>([]);

  const api = useMemo<AdcDatabaseApi>(
    () => ({
      async insertReading(value: number) {
        readings.current.push({ value, createdAt: Date.now() });
      },
      async getLatestValue() {
        const last = readings.current.at(-1);
        return last?.value ?? null;
      },
      async listRecentReadings(options) {
        const limit = options?.limit ?? 120;
        const sinceMs = options?.sinceMs;
        const order = options?.order ?? "asc";

        const filtered =
          sinceMs == null
            ? readings.current
            : readings.current.filter((r) => r.createdAt >= sinceMs);

        const slice = filtered.slice(-limit);
        if (order === "desc") return [...slice].reverse();
        return slice;
      },
    }),
    [],
  );

  return (
    <AdcDatabaseContext.Provider value={api}>{children}</AdcDatabaseContext.Provider>
  );
}

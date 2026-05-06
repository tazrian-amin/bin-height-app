import React, { useMemo, type ReactNode } from "react";
import {
  SQLiteProvider,
  useSQLiteContext,
  type SQLiteDatabase,
} from "expo-sqlite";

import {
  AdcDatabaseContext,
  type AdcDatabaseApi,
  type AdcReading,
} from "@/contexts/adc-database-context";

const ADC_DB_NAME = "bin-height.db";

async function initAdcDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS adc_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  value INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
`);
}

function SqliteAdcApiProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();

  const api = useMemo<AdcDatabaseApi>(
    () => ({
      async insertReading(value: number) {
        await db.runAsync(
          "INSERT INTO adc_readings (value, created_at) VALUES (?, ?)",
          value,
          Date.now(),
        );
      },
      async getLatestValue() {
        const row = await db.getFirstAsync<{ value: number }>(
          "SELECT value FROM adc_readings ORDER BY id DESC LIMIT 1",
        );
        return row?.value ?? null;
      },
      async listRecentReadings(options) {
        const limit = Math.max(1, Math.min(2000, options?.limit ?? 120));
        const sinceMs = options?.sinceMs;
        const order = options?.order ?? "asc";

        // Fetch newest rows first (fast with ORDER BY id), then re-order for charting.
        const rows = await db.getAllAsync<{ value: number; created_at: number }>(
          sinceMs == null
            ? "SELECT value, created_at FROM adc_readings ORDER BY id DESC LIMIT ?"
            : "SELECT value, created_at FROM adc_readings WHERE created_at >= ? ORDER BY id DESC LIMIT ?",
          ...(sinceMs == null ? [limit] : [sinceMs, limit]),
        );

        const mapped: AdcReading[] = rows.map((r) => ({
          value: r.value,
          createdAt: r.created_at,
        }));

        if (order === "desc") return mapped;
        return mapped.reverse();
      },
    }),
    [db],
  );

  return (
    <AdcDatabaseContext.Provider value={api}>{children}</AdcDatabaseContext.Provider>
  );
}

export function AdcSqliteRoot({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName={ADC_DB_NAME} onInit={initAdcDatabase}>
      <SqliteAdcApiProvider>{children}</SqliteAdcApiProvider>
    </SQLiteProvider>
  );
}

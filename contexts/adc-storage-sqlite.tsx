import React, { useMemo, type ReactNode } from "react";
import {
  SQLiteProvider,
  useSQLiteContext,
  type SQLiteDatabase,
} from "expo-sqlite";

import { AdcDatabaseContext, type AdcDatabaseApi } from "@/contexts/adc-database-context";

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

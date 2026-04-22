import { requireOptionalNativeModule } from "expo";
import React, { useMemo, type ComponentType, type ReactNode } from "react";

import { MemoryAdcStorageProvider } from "@/contexts/adc-database-context";

const EXPO_SQLITE_NATIVE = "ExpoSQLite";

type AdcRootChildProps = { children: ReactNode };

function resolveSqliteRoot(): ComponentType<AdcRootChildProps> | null {
  // Do not `require('expo-sqlite')` for detection: that package calls
  // `requireNativeModule('ExpoSQLite')` at load time and throws if the binary
  // was built without it. Optional probe matches that lookup without throwing.
  if (requireOptionalNativeModule(EXPO_SQLITE_NATIVE) == null) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@/contexts/adc-storage-sqlite").AdcSqliteRoot;
}

/**
 * Uses SQLite when the native `ExpoSQLite` module is linked (Expo Go / rebuilt
 * dev client). Otherwise falls back to in-memory storage so the app still runs
 * until you rebuild: `npx expo run:android`.
 */
export function AdcStorageRoot({ children }: { children: ReactNode }) {
  const SqliteRoot = useMemo(() => resolveSqliteRoot(), []);

  if (SqliteRoot == null) {
    if (__DEV__) {
      console.warn(
        "[ADC] expo-sqlite native module not found. Rebuild the app (e.g. `npx expo run:android`) for persisted ADC history. Using in-memory storage for this session.",
      );
    }
    return <MemoryAdcStorageProvider>{children}</MemoryAdcStorageProvider>;
  }

  return <SqliteRoot>{children}</SqliteRoot>;
}

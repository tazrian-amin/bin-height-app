/**
 * HM-10 / JDY-08 style transparent UART BLE modules commonly expose:
 * - Service FFE0
 * - One data characteristic FFE1 (notify + write)
 *
 * Clones may differ; adjust if your module uses another GATT layout.
 */
export const HM10_BLE_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
export const HM10_BLE_DATA_CHAR_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";

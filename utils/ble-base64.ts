/**
 * Decode react-native-ble-plx Base64 characteristic payloads to a UTF-8-ish string.
 * ADC lines are ASCII-only; this is sufficient for `ADC value:1234`.
 */
export function bleBase64ToAscii(b64: string): string {
  const trimmed = String(b64 ?? "").trim();
  if (!trimmed) return "";
  try {
    const binary = atob(trimmed);
    let out = "";
    for (let i = 0; i < binary.length; i++) {
      out += String.fromCharCode(binary.charCodeAt(i) & 0xff);
    }
    return out;
  } catch {
    return "";
  }
}

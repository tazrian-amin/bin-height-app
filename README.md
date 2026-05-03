# Bin Height App

Expo / React Native app for bin height measurement, with Bluetooth and USB (OTG) device modes.

## Prerequisites (development testing)

- **Android:** Developer options enabled; **USB debugging** and **Wireless debugging** turned on; **OTG** support enabled in settings (wording varies by device).
- **Network:** Your PC and phone must be on the **same Wi‑Fi network**.

### Connect ADB over Wi‑Fi

Use a USB cable first, then switch to wireless so you can disconnect the cable.

1. Connect the phone to the PC with USB.
2. In a terminal, verify the device is visible:

   ```bash
   adb devices
   ```

3. Start TCP/IP mode on the device:

   ```bash
   adb tcpip 5555
   ```

4. On the phone, find its IP address (e.g. **Settings → About phone → Status**, or your Wi‑Fi network details).
5. Unplug the USB cable.
6. Connect from the PC (replace with your phone’s IP):

   ```bash
   adb connect <device-ip>:5555
   ```

7. Confirm wireless ADB:

   ```bash
   adb devices
   ```

   The device should still appear as connected.

---

## Setup and test (end-to-end)

### 1. Install the Android build

Install the development build on your device:

https://expo.dev/accounts/tazrian/projects/bin-height-app/builds/c4a6f652-c507-45f2-9716-8578d8286645

### 2. Run the app from this repository (PC)

Clone and open this repo in your editor (e.g. VS Code), then from the project root:

```bash
npm install
npm run android
```

Repository: https://github.com/tazrian-amin/bin-height-app

### 3. Flash firmware to the Swan (PC)

Clone the firmware repository and flash with **PlatformIO**:

https://github.com/tazrian-amin/Bin-Height-Measurement-Firmware

Before uploading:

1. Connect the **Swan** to the PC with USB.
2. Enter bootloader: **hold BOOT**, press **RST** once, then **release BOOT** (per your board’s usual procedure).
3. Upload the firmware from PlatformIO.

### 4. Test Bluetooth mode

1. Open the installed Android app.
2. Use **Bluetooth** to scan and connect to the Swan.
3. After a successful connection, open the **Device** screen to see live ADC values.

### 5. Test USB (OTG) mode

1. On the **Configure** screen, disconnect the current device if one is connected.
2. Use an **OTG adapter** to connect the **Swan’s USB** to the phone’s **USB‑C** port.
3. Switch to **USB** mode, scan for devices, and connect to the Swan.
4. On the **Device** screen, confirm live ADC values again.

---

## Learn more (Expo)

- [Expo documentation](https://docs.expo.dev/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)

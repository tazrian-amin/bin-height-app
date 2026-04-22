import type { ConfigPlugin } from '@expo/config-plugins';
import { AndroidConfig, withAndroidManifest } from '@expo/config-plugins';

const USB_HOST_FEATURE = 'android.hardware.usb.host';

function ensureUsesFeature(
  androidManifest: AndroidConfig.Manifest.AndroidManifest,
  featureName: string,
) {
  const usesFeature = (androidManifest.manifest['uses-feature'] ??= []);
  const already = usesFeature.some((f) => f.$?.['android:name'] === featureName);
  if (!already) {
    usesFeature.push({
      $: {
        'android:name': featureName,
        'android:required': 'true',
      },
    });
  }
}

const withUsbHost: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (configWithManifest) => {
    ensureUsesFeature(configWithManifest.modResults, USB_HOST_FEATURE);
    return configWithManifest;
  });
};

export default withUsbHost;


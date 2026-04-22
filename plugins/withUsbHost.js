const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const USB_HOST_FEATURE = 'android.hardware.usb.host';

function ensureUsesFeature(androidManifest, featureName) {
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

module.exports = function withUsbHost(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    ensureUsesFeature(configWithManifest.modResults, USB_HOST_FEATURE);
    return configWithManifest;
  });
};


import {
  MiningSentryNavigationDark,
  MiningSentryNavigationLight,
} from '@/constants/navigation-theme';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AdcStorageRoot } from '@/contexts/adc-storage-root';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Anton_400Regular,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  useEffect(() => {
    if (fontError) {
      console.warn('Mining Sentry fonts failed to load', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const navigationTheme =
    colorScheme === 'dark'
      ? MiningSentryNavigationDark
      : MiningSentryNavigationLight;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <AdcStorageRoot>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </AdcStorageRoot>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

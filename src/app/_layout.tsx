import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useChromeColors } from '@/hooks/use-chrome-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemePreferenceProvider } from '@/hooks/use-theme-preference';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    // Root for press-and-hold drag gestures (e.g. reordering shopping items).
    <GestureHandlerRootView style={styles.root}>
      <ThemePreferenceProvider>
        <ThemedStack />
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStack() {
  const colorScheme = useColorScheme();
  const colors = useChromeColors();

  // Everything a screen transition can briefly reveal — the native root view
  // (document body on web), the navigation container and each screen's
  // container — uses the app's own background, so going back in dark mode
  // never flashes white.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch((error) => {
      console.warn('Failed to set root background color', error);
    });
  }, [colors.background]);

  const navigationTheme = useMemo(() => {
    const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: colors.background, card: colors.background },
    };
  }, [colorScheme, colors.background]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="records/index" />
        <Stack.Screen name="records/[category]" />
        <Stack.Screen name="shopping/index" />
        <Stack.Screen name="shopping/[id]" />
        <Stack.Screen name="dtr" />
        <Stack.Screen name="profile" />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

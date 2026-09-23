import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemePreferenceProvider } from '@/hooks/use-theme-preference';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <ThemedStack />
    </ThemePreferenceProvider>
  );
}

function ThemedStack() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="purchases" />
        <Stack.Screen name="dtr" />
        <Stack.Screen name="profile" />
      </Stack>
    </ThemeProvider>
  );
}

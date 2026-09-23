import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, Platform } from 'react-native';

import { useSystemColorScheme } from '@/hooks/use-system-color-scheme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'theme-preference';

const PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  colorScheme: ResolvedColorScheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

/**
 * Holds the user's Light / Dark / System choice, persists it in AsyncStorage,
 * and resolves it to the color scheme every themed component renders with.
 */
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isLoading, setIsLoading] = useState(true);
  const systemScheme = useSystemColorScheme();

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        if (PREFERENCES.includes(raw as ThemePreference)) {
          setPreferenceState(raw as ThemePreference);
        }
      })
      .catch((error) => {
        console.warn('Failed to load theme preference from storage', error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Skip until the initial load above finishes, so we don't clobber storage
    // with the default starting state.
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEY, preference).catch((error) => {
      console.warn('Failed to save theme preference to storage', error);
    });
  }, [preference, isLoading]);

  // On native, also override the app-level appearance so OS-drawn UI (tab bar,
  // date pickers, alerts, status bar) matches. 'unspecified' hands control
  // back to the OS. react-native-web has no setColorScheme.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const colorScheme: ResolvedColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  // Keep browser-drawn controls (e.g. <input type="date">) in sync on web.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.colorScheme = colorScheme;
  }, [colorScheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const value = useMemo(
    () => ({ preference, colorScheme, setPreference }),
    [preference, colorScheme, setPreference],
  );

  // Hold the app until the saved preference is read, so it never flashes the
  // wrong theme on launch. On native the splash screen stays up meanwhile.
  if (isLoading) return null;

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference(): ThemePreferenceContextValue {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error('useThemePreference must be used inside ThemePreferenceProvider');
  }
  return context;
}

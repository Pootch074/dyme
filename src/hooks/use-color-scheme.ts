import { type ResolvedColorScheme, useThemePreference } from '@/hooks/use-theme-preference';

/** The color scheme the app should render with, after applying the user's theme setting. */
export function useColorScheme(): ResolvedColorScheme {
  return useThemePreference().colorScheme;
}

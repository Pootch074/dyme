import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Colors for the app shell around the screens: the root / navigation
 * background (visible during screen transitions) and the tab bar.
 * Android has its own version matching the Jetpack Compose screens.
 */
export function useChromeColors(): {
  background: string;
  tabBar: string;
  tabIndicator: string;
  tabLabel: string;
  tabIcon?: { default: string; selected: string };
} {
  const colors = Colors[useColorScheme()];
  return {
    background: colors.background,
    tabBar: colors.background,
    tabIndicator: colors.backgroundElement,
    tabLabel: colors.text,
  };
}

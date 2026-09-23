import { useAppMaterialColors } from '@/components/compose/theme';

/**
 * Android: the app shell uses the same Material 3 palette as the Jetpack
 * Compose screens, so transitions and the tab bar match them exactly.
 */
export function useChromeColors() {
  const colors = useAppMaterialColors();
  return {
    background: colors.background,
    tabBar: colors.surfaceContainer,
    tabIndicator: colors.secondaryContainer,
    tabLabel: colors.onSurface,
    // Selected icon sits on the indicator pill, so it needs the pill's content color.
    tabIcon: { default: colors.onSurfaceVariant, selected: colors.onSecondaryContainer },
  };
}

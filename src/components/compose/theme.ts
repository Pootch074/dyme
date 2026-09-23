import { useMaterialColors } from '@expo/ui/jetpack-compose';

import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Seed for the app's Material 3 palette on Android. A fixed seed (the app's
 * blue accent) keeps colors consistent across devices, instead of following
 * each user's wallpaper (Material You).
 */
export const MATERIAL_SEED_COLOR = '#3c87f7';

/** The Material 3 palette for the current theme setting (Light / Dark / System). */
export function useAppMaterialColors() {
  const colorScheme = useColorScheme();
  return useMaterialColors({ colorScheme, seedColor: MATERIAL_SEED_COLOR });
}

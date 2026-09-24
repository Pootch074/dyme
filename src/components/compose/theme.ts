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

/**
 * Green for "done" states (e.g. an item confirmed in the cart). Material 3 has
 * no success role, and the seed-derived tertiary isn't green, so it's fixed here.
 */
export function useSuccessColors() {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark'
    ? { accent: '#5FD37F', container: '#173B24', onContainer: '#B8F0C8' }
    : { accent: '#1E7F3C', container: '#D3F0DC', onContainer: '#0B3D1B' };
}

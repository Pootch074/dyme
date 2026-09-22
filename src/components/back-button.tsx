import { Feather } from '@react-native-vector-icons/feather';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Back affordance for screens pushed outside the tab bar (see the root Stack in app/_layout.tsx). */
export function BackButton() {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Feather name="chevron-left" size={22} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});

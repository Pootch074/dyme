import { Feather } from '@react-native-vector-icons/feather';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type RevealToggleProps = {
  revealed: boolean;
  onToggle: () => void;
  /** What it reveals, for screen readers, e.g. "password". */
  label: string;
  style?: StyleProp<ViewStyle>;
};

/** Eye button that shows or hides a sensitive value (a password, card number…). */
export function RevealToggle({ revealed, onToggle, label, style }: RevealToggleProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`${revealed ? 'Hide' : 'Show'} ${label}`}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}>
      <Feather name={revealed ? 'eye-off' : 'eye'} size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});

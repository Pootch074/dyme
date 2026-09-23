import { Feather, type FeatherIconName } from '@react-native-vector-icons/feather';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: FeatherIconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const PRIMARY = '#3c87f7';

/** The app's standard filled button (blue primary, grey secondary, red danger). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const backgroundColor =
    variant === 'primary' ? PRIMARY : variant === 'danger' ? theme.danger : theme.backgroundSelected;
  const color = variant === 'secondary' ? theme.text : '#ffffff';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        (pressed || disabled) && styles.pressed,
        style,
      ]}>
      {icon ? <Feather name={icon} size={16} color={color} /> : null}
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});

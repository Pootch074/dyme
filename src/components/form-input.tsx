import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FormInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: TextInputProps['keyboardType'];
  /** Outlines the field in the danger color, e.g. when a required value is missing. */
  invalid?: boolean;
  accessibilityLabel?: string;
};

export function FormInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  invalid,
  accessibilityLabel,
}: FormInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      keyboardType={keyboardType}
      accessibilityLabel={accessibilityLabel ?? placeholder}
      style={[
        styles.input,
        {
          color: theme.text,
          backgroundColor: theme.backgroundSelected,
          borderColor: invalid ? theme.danger : 'transparent',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 16,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
});

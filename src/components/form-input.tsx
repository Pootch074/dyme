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
  /** When false the value is shown read-only, without the input's filled background. */
  editable?: boolean;
  multiline?: boolean;
  accessibilityLabel?: string;
};

export function FormInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  invalid,
  editable = true,
  multiline = false,
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
      editable={editable}
      multiline={multiline}
      accessibilityLabel={accessibilityLabel ?? placeholder}
      style={[
        styles.input,
        multiline && styles.multiline,
        {
          color: theme.text,
          backgroundColor: editable ? theme.backgroundSelected : 'transparent',
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
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});

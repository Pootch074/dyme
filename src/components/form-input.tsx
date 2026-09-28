import type { Ref } from 'react';
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
  /** Hides the typed characters, e.g. for a password. */
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  autoComplete?: TextInputProps['autoComplete'];
  accessibilityLabel?: string;
  /** Focuses the field (bringing up the keyboard) as soon as it appears. */
  autoFocus?: boolean;
  onFocus?: () => void;
  /** The field lost focus, e.g. a tap elsewhere or the keyboard being closed. */
  onBlur?: () => void;
  /** Return / Enter key, e.g. to move to the next field or submit. */
  onSubmitEditing?: () => void;
  returnKeyType?: TextInputProps['returnKeyType'];
  /** Room at the end for a button drawn over the field (e.g. show/hide). */
  trailingInset?: number;
  ref?: Ref<TextInput>;
};

export function FormInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  invalid,
  editable = true,
  multiline = false,
  secureTextEntry,
  autoCapitalize,
  autoCorrect,
  autoComplete,
  accessibilityLabel,
  autoFocus,
  onFocus,
  onBlur,
  onSubmitEditing,
  returnKeyType,
  trailingInset,
  ref,
}: FormInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      ref={ref}
      value={value}
      autoFocus={autoFocus}
      onFocus={onFocus}
      onBlur={onBlur}
      onSubmitEditing={onSubmitEditing}
      returnKeyType={returnKeyType}
      // Keeps the keyboard up when Return moves focus to the next field.
      submitBehavior={returnKeyType === 'next' ? 'submit' : undefined}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      keyboardType={keyboardType}
      editable={editable}
      multiline={multiline}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      autoComplete={autoComplete}
      accessibilityLabel={accessibilityLabel ?? placeholder}
      style={[
        styles.input,
        multiline && styles.multiline,
        trailingInset !== undefined && { paddingRight: trailingInset },
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

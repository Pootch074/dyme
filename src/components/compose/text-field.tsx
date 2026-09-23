import {
  OutlinedTextField,
  Text,
  type TextFieldKeyboardType,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { useEffect, useRef } from 'react';

type ControlledTextFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  label: string;
  /** Helper or error text under the field. */
  supportingText?: string | null;
  isError?: boolean;
  keyboardType?: TextFieldKeyboardType;
  multiline?: boolean;
  prefix?: string;
};

/**
 * Material 3 outlined text field driven by a plain `value` prop. Compose text
 * fields hold their text in native state; this keeps that state in sync when
 * `value` changes from JS (e.g. a form reset or Cancel restoring saved values).
 */
export function ControlledTextField({
  value,
  onChangeText,
  label,
  supportingText,
  isError,
  keyboardType = 'text',
  multiline = false,
  prefix,
}: ControlledTextFieldProps) {
  const text = useNativeState(value);
  // Last value the field and JS agreed on, so typing doesn't echo back into
  // the native state (which would fight the cursor).
  const lastValue = useRef(value);

  useEffect(() => {
    if (value !== lastValue.current) {
      lastValue.current = value;
      text.set(value);
    }
  }, [value, text]);

  return (
    <OutlinedTextField
      value={text}
      onValueChange={(next) => {
        lastValue.current = next;
        onChangeText(next);
      }}
      isError={isError}
      singleLine={!multiline}
      minLines={multiline ? 3 : undefined}
      keyboardOptions={{
        keyboardType,
        capitalization: keyboardType === 'text' ? 'sentences' : 'none',
        imeAction: multiline ? 'default' : 'next',
      }}
      modifiers={[fillMaxWidth()]}>
      <OutlinedTextField.Label>
        <Text>{label}</Text>
      </OutlinedTextField.Label>
      {prefix ? (
        <OutlinedTextField.Prefix>
          <Text>{prefix}</Text>
        </OutlinedTextField.Prefix>
      ) : null}
      {supportingText ? (
        <OutlinedTextField.SupportingText>
          <Text>{supportingText}</Text>
        </OutlinedTextField.SupportingText>
      ) : null}
    </OutlinedTextField>
  );
}

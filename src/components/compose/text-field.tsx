import {
  OutlinedTextField,
  Text,
  type TextFieldKeyboardType,
  type TextFieldRef,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth, type ModifierConfig } from '@expo/ui/jetpack-compose/modifiers';
import { type ReactNode, type Ref, useEffect, useRef } from 'react';

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
  /** Hides the characters (e.g. a password); pair with a trailing show/hide button. */
  masked?: boolean;
  /** Typed exactly as entered: no auto-capitals or corrections (numbers, emails, usernames). */
  exact?: boolean;
  /** Icon button at the end of the field, e.g. show/hide. */
  trailing?: ReactNode;
  /** Shown but not typed into, e.g. as a dropdown's anchor. */
  readOnly?: boolean;
  onFocusChange?: (focused: boolean) => void;
  /** Imperative handle, e.g. to blur the field when another control takes over. */
  fieldRef?: Ref<TextFieldRef>;
  /** Defaults to full width. */
  modifiers?: ModifierConfig[];
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
  masked = false,
  exact = false,
  trailing,
  readOnly = false,
  onFocusChange,
  fieldRef,
  modifiers,
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
      ref={fieldRef}
      value={text}
      onFocusChanged={onFocusChange}
      onValueChange={(next) => {
        lastValue.current = next;
        onChangeText(next);
      }}
      isError={isError}
      singleLine={!multiline}
      readOnly={readOnly}
      visualTransformation={masked ? 'password' : 'none'}
      minLines={multiline ? 3 : undefined}
      keyboardOptions={{
        keyboardType,
        capitalization: keyboardType === 'text' && !exact ? 'sentences' : 'none',
        autoCorrectEnabled: !exact,
        imeAction: multiline ? 'default' : 'next',
      }}
      modifiers={modifiers ?? [fillMaxWidth()]}>
      <OutlinedTextField.Label>
        <Text>{label}</Text>
      </OutlinedTextField.Label>
      {prefix ? (
        <OutlinedTextField.Prefix>
          <Text>{prefix}</Text>
        </OutlinedTextField.Prefix>
      ) : null}
      {trailing ? <OutlinedTextField.TrailingIcon>{trailing}</OutlinedTextField.TrailingIcon> : null}
      {supportingText ? (
        <OutlinedTextField.SupportingText>
          <Text>{supportingText}</Text>
        </OutlinedTextField.SupportingText>
      ) : null}
    </OutlinedTextField>
  );
}

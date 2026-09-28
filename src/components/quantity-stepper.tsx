import { Feather } from '@react-native-vector-icons/feather';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** The app's blue accent, as on its primary buttons. */
const ACCENT = '#3c87f7';

type QuantityStepperProps = {
  value: number;
  onChange: (quantity: number) => void;
  itemName: string;
  min?: number;
};

/** Longest quantity that can be typed (up to 9999). */
const MAX_DIGITS = 4;
/** How long the field's border confirms a save (green) or a rejected entry (red). */
const FEEDBACK_MS = 900;
/** Field width for 1–2 digits, plus room per extra digit (16px bold, tabular). */
const INPUT_BASE_WIDTH = 44;
const DIGIT_WIDTH = 10;

/**
 * −/+ quantity control with a directly editable count in between: tap the
 * count to type a new one (it's selected, ready to replace). It saves as soon
 * as the field loses focus (tapping elsewhere, closing the keyboard or Done).
 * Only digits can be typed; an empty entry or one below `min` puts the old
 * quantity back. Either way the border briefly shows what happened.
 */
export function QuantityStepper({ value, onChange, itemName, min = 1 }: QuantityStepperProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  // Non-null only while the field is focused, so the displayed text always
  // reflects `value` (e.g. after a +/- tap) without needing to sync via an effect.
  const [draft, setDraft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'saved' | 'rejected' | null>(null);
  const isEditing = draft !== null;
  const atMin = value <= min;

  // Closing the keyboard (e.g. Android's Back, or tapping outside the list on
  // Android where the list is hosted in Compose) ends editing, which saves.
  useEffect(() => {
    if (!isEditing) return;
    const subscription = Keyboard.addListener('keyboardDidHide', () => inputRef.current?.blur());
    return () => subscription.remove();
  }, [isEditing]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [feedback]);

  const commit = (raw: string) => {
    setDraft(null);
    // Number() also drops leading zeros, so "007" saves (and shows) as 7.
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isNaN(parsed) || parsed < min) {
      setFeedback('rejected');
      return;
    }
    if (parsed !== value) {
      onChange(parsed);
      setFeedback('saved');
    }
  };

  const shown = draft ?? String(value);
  const borderColor = isEditing
    ? ACCENT
    : feedback === 'saved'
      ? theme.success
      : feedback === 'rejected'
        ? theme.danger
        : theme.backgroundSelected;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={atMin}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Decrease quantity of ${itemName}`}
        style={({ pressed }) => [
          styles.stepButton,
          pressed && !atMin && { backgroundColor: theme.backgroundSelected },
          atMin && styles.stepButtonDisabled,
        ]}>
        <Feather name="minus" size={18} color={atMin ? theme.textSecondary : theme.text} />
      </Pressable>

      <TextInput
        ref={inputRef}
        value={shown}
        // Digits only, whatever the keyboard or a paste lets through ("3 pcs" → "3").
        onChangeText={(text) => setDraft(text.replace(/\D/g, '').slice(0, MAX_DIGITS))}
        onFocus={() => {
          setFeedback(null);
          setDraft(String(value));
        }}
        onBlur={() => draft !== null && commit(draft)}
        onSubmitEditing={() => draft !== null && commit(draft)}
        keyboardType="number-pad"
        returnKeyType="done"
        maxLength={MAX_DIGITS}
        selectTextOnFocus
        selectionColor={ACCENT}
        cursorColor={ACCENT}
        accessibilityLabel={`Quantity of ${itemName}, ${value}, tap to type`}
        style={[
          styles.input,
          {
            // Grows for 3–4 digit quantities instead of clipping them.
            width: INPUT_BASE_WIDTH + Math.max(0, shown.length - 2) * DIGIT_WIDTH,
            color: theme.text,
            borderColor,
            backgroundColor: isEditing ? theme.background : 'transparent',
          },
        ]}
      />

      <Pressable
        onPress={() => onChange(value + 1)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Increase quantity of ${itemName}`}
        style={({ pressed }) => [
          styles.stepButton,
          pressed && { backgroundColor: theme.backgroundSelected },
        ]}>
        <Feather name="plus" size={18} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  stepButton: {
    // 36 visible, 48 with the hit slop: a comfortable thumb target.
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: {
    opacity: 0.3,
  },
  input: {
    height: 32,
    borderWidth: 1.5,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    // Equal-width digits, so the number doesn't shift as it's typed.
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
    paddingHorizontal: 2,
    // Android: without these the digits sit low in the box.
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});

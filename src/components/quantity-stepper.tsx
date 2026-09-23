import { Feather } from '@react-native-vector-icons/feather';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type QuantityStepperProps = {
  value: number;
  onChange: (quantity: number) => void;
  itemName: string;
  min?: number;
};

/** Compact −/+ quantity control with a directly-editable count in between. */
export function QuantityStepper({ value, onChange, itemName, min = 1 }: QuantityStepperProps) {
  const theme = useTheme();
  // Non-null only while the field is focused, so the displayed text always
  // reflects `value` (e.g. after a +/- tap) without needing to sync via an effect.
  const [draft, setDraft] = useState<string | null>(null);
  const atMin = value <= min;

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    const parsed = Number(trimmed);
    if (/^\d+$/.test(trimmed) && parsed >= min && parsed !== value) onChange(parsed);
    setDraft(null);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={atMin}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Decrease quantity of ${itemName}`}
        style={({ pressed }) => [
          styles.stepButton,
          pressed && !atMin && styles.stepButtonPressed,
          atMin && styles.stepButtonDisabled,
        ]}>
        <Feather name="minus" size={14} color={atMin ? theme.textSecondary : theme.text} />
      </Pressable>

      <TextInput
        value={draft ?? String(value)}
        onChangeText={setDraft}
        onFocus={() => setDraft(String(value))}
        onBlur={() => draft !== null && commit(draft)}
        onSubmitEditing={() => draft !== null && commit(draft)}
        keyboardType="number-pad"
        maxLength={4}
        selectTextOnFocus
        accessibilityLabel={`Quantity of ${itemName}`}
        style={[styles.input, { color: theme.text }]}
      />

      <Pressable
        onPress={() => onChange(value + 1)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Increase quantity of ${itemName}`}
        style={({ pressed }) => [styles.stepButton, pressed && styles.stepButtonPressed]}>
        <Feather name="plus" size={14} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonPressed: {
    opacity: 0.6,
  },
  stepButtonDisabled: {
    opacity: 0.3,
  },
  input: {
    width: 30,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 0,
  },
});

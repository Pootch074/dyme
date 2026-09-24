import { Feather, type FeatherIconName } from '@react-native-vector-icons/feather';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isKeyEnabled, type KeypadKey, type KeypadTarget } from '@/utils/keypad';

// Layout from the spec, with "." added beside 0 so prices like ₱250.50 can be typed.
const ROWS: (KeypadKey | null)[][] = [
  ['1', '2', '3', 'erase'],
  ['4', '5', '6', 'clear'],
  ['7', '8', '9', null],
  ['.99', '0', '.', null],
];

// Erase and Clear show icons; their names stay as the spoken labels.
const ACTION_KEYS: Partial<Record<KeypadKey, { icon: FeatherIconName; label: string }>> = {
  erase: { icon: 'delete', label: 'Erase' },
  clear: { icon: 'x-circle', label: 'Clear' },
};

type NumberPadProps = {
  target: KeypadTarget;
  onKey: (key: KeypadKey) => void;
};

/** On-screen number pad for prices and quantities: 0–9, ".", ".99", Erase and Clear. */
export function NumberPad({ target, onKey }: NumberPadProps) {
  const theme = useTheme();

  return (
    <View style={styles.pad}>
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key, keyIndex) => {
            if (!key) return <View key={`empty-${keyIndex}`} style={styles.key} />;
            const enabled = isKeyEnabled(target, key);
            const action = ACTION_KEYS[key];
            const isAction = action !== undefined;
            return (
              <Pressable
                key={key}
                onPress={() => onKey(key)}
                disabled={!enabled}
                accessibilityRole="button"
                accessibilityLabel={action?.label ?? key}
                style={({ pressed }) => [
                  styles.key,
                  { backgroundColor: isAction ? theme.backgroundSelected : theme.background },
                  pressed && styles.pressed,
                  !enabled && styles.disabled,
                ]}>
                {action ? (
                  <Feather name={action.icon} size={22} color={theme.text} />
                ) : (
                  <ThemedText style={styles.digit}>{key}</ThemedText>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  key: {
    flex: 1,
    height: 52,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: 22,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.3,
  },
});

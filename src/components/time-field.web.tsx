import { Feather } from '@react-native-vector-icons/feather';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TimeFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
};

// @react-native-community/datetimepicker has no web implementation, so the
// web build falls back to the browser's native <input type="time">.
export function TimeField({ label, value, onChange }: TimeFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.row}>
        <ThemedView type="backgroundSelected" style={styles.field}>
          <input
            type="time"
            aria-label={label}
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value || null)}
            style={{
              fontSize: 16,
              fontFamily: 'inherit',
              color: theme.text,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              width: '100%',
              padding: 0,
            }}
          />
        </ThemedView>

        {value ? (
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
            <Feather name="x" size={16} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 140,
    gap: Spacing.half,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  field: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});

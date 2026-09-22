import { StyleSheet, View } from 'react-native';

import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toDateOnlyString, toTimeOnlyString, withDatePart, withTimePart } from '@/utils/date';

type DateTimeFieldProps = {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

// @react-native-community/datetimepicker has no web implementation, so the
// web build falls back to the browser's native <input type="date"/"time">.
export function DateTimeField({ value, onChange, maximumDate }: DateTimeFieldProps) {
  const theme = useTheme();
  const inputStyle = {
    fontSize: 16,
    fontFamily: 'inherit',
    color: theme.text,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    width: '100%',
    padding: 0,
  } as const;

  return (
    <View style={styles.row}>
      <ThemedView type="backgroundSelected" style={styles.field}>
        <input
          type="date"
          value={toDateOnlyString(value)}
          max={maximumDate ? toDateOnlyString(maximumDate) : undefined}
          onChange={(event) => {
            if (!event.target.value) return;
            onChange(withDatePart(value, event.target.value));
          }}
          style={inputStyle}
        />
      </ThemedView>

      <ThemedView type="backgroundSelected" style={styles.field}>
        <input
          type="time"
          value={toTimeOnlyString(value)}
          onChange={(event) => {
            if (!event.target.value) return;
            onChange(withTimePart(value, event.target.value));
          }}
          style={inputStyle}
        />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  field: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});

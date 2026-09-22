import { StyleSheet } from 'react-native';

import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toDateOnlyString, withDatePart } from '@/utils/date';

type DateFieldProps = {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

// @react-native-community/datetimepicker has no web implementation, so the
// web build falls back to the browser's native <input type="date">.
export function DateField({ value, onChange, maximumDate }: DateFieldProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundSelected" style={styles.field}>
      <input
        type="date"
        value={toDateOnlyString(value)}
        max={maximumDate ? toDateOnlyString(maximumDate) : undefined}
        onChange={(event) => {
          if (!event.target.value) return;
          onChange(withDatePart(value, event.target.value));
        }}
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
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});

import { Feather } from '@react-native-vector-icons/feather';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DialogHost, TimeDialog } from './compose/picker-dialogs';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeOnly12h, toTimeOnlyString, withTimePart } from '@/utils/date';

type TimeFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
};

// Opens the app's Material 3 clock dialog (12-hour, AM/PM), the same one the Compose screens use.
export function TimeField({ label, value, onChange }: TimeFieldProps) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const pickerValue = withTimePart(new Date(), value ?? '12:00');

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.row}>
        <Pressable
          onPress={() => setShowPicker(true)}
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${value ? formatTimeOnly12h(pickerValue) : 'not recorded'}`}
          style={({ pressed }) => [styles.fieldPressable, pressed && styles.pressed]}>
          <ThemedView type="backgroundSelected" style={styles.field}>
            <ThemedText themeColor={value ? 'text' : 'textSecondary'}>
              {value ? formatTimeOnly12h(pickerValue) : 'Not recorded'}
            </ThemedText>
          </ThemedView>
        </Pressable>

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

      {showPicker && (
        <DialogHost>
          <TimeDialog
            value={pickerValue}
            onSelect={(picked) => {
              setShowPicker(false);
              onChange(toTimeOnlyString(picked));
            }}
            onDismiss={() => setShowPicker(false)}
          />
        </DialogHost>
      )}
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
  fieldPressable: {
    flex: 1,
  },
  field: {
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

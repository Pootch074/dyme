import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DateDialog, DialogHost, TimeDialog } from './compose/picker-dialogs';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { formatDisplayDate, formatTimeOnly12h, toDateOnlyString, withDatePart } from '@/utils/date';

type DateTimeFieldProps = {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

type PickerMode = 'date' | 'time';

// Date and time triggers opening the app's Material 3 date and clock dialogs,
// the same ones the Compose screens use; each keeps the other part of `value`.
export function DateTimeField({ value, onChange, maximumDate }: DateTimeFieldProps) {
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const close = () => setPickerMode(null);

  return (
    <View style={styles.row}>
      <ThemedView type="backgroundSelected" style={styles.field}>
        <Pressable
          onPress={() => setPickerMode('date')}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText>{formatDisplayDate(value)}</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView type="backgroundSelected" style={styles.field}>
        <Pressable
          onPress={() => setPickerMode('time')}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText>{formatTimeOnly12h(value)}</ThemedText>
        </Pressable>
      </ThemedView>

      {pickerMode && (
        <DialogHost>
          {pickerMode === 'date' ? (
            <DateDialog
              value={toDateOnlyString(value)}
              maximumDate={maximumDate}
              onSelect={(dateOnly) => {
                close();
                onChange(withDatePart(value, dateOnly));
              }}
              onDismiss={close}
            />
          ) : (
            <TimeDialog
              value={value}
              onSelect={(picked) => {
                close();
                onChange(picked);
              }}
              onDismiss={close}
            />
          )}
        </DialogHost>
      )}
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
  pressed: {
    opacity: 0.7,
  },
});

import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { DateDialog, DialogHost } from './compose/picker-dialogs';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { formatDisplayDate, parseDateOnly, toDateOnlyString } from '@/utils/date';

type DateFieldProps = {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

// Opens the app's Material 3 date dialog, the same one the Compose screens use.
export function DateField({ value, onChange, maximumDate }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <ThemedView type="backgroundSelected" style={styles.field}>
        <Pressable
          onPress={() => setShowPicker(true)}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText>{formatDisplayDate(value)}</ThemedText>
        </Pressable>
      </ThemedView>

      {showPicker && (
        <DialogHost>
          <DateDialog
            value={toDateOnlyString(value)}
            maximumDate={maximumDate}
            onSelect={(dateOnly) => {
              setShowPicker(false);
              onChange(parseDateOnly(dateOnly));
            }}
            onDismiss={() => setShowPicker(false)}
          />
        </DialogHost>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});

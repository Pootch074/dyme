import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { formatDisplayDate } from '@/utils/date';

type DateFieldProps = {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

export function DateField({ value, onChange, maximumDate }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        maximumDate,
        onValueChange: (_event, selectedDate) => {
          if (selectedDate) onChange(selectedDate);
        },
      });
      return;
    }
    setShowPicker(true);
  };

  return (
    <>
      <ThemedView type="backgroundSelected" style={styles.field}>
        <Pressable onPress={openPicker} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText>{formatDisplayDate(value)}</ThemedText>
        </Pressable>
      </ThemedView>

      {Platform.OS === 'ios' && showPicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          onValueChange={(_event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) onChange(selectedDate);
          }}
        />
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

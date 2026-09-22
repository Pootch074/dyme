import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { formatDisplayDate, formatTimeOnly } from '@/utils/date';

type DateTimeFieldProps = {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

type PickerMode = 'date' | 'time';

// Android has no combined date+time dialog (mode "datetime" is iOS-only), so
// both platforms get two separate triggers that each update the same value.
export function DateTimeField({ value, onChange, maximumDate }: DateTimeFieldProps) {
  const [iosPickerMode, setIosPickerMode] = useState<PickerMode | null>(null);

  const openPicker = (mode: PickerMode) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        maximumDate: mode === 'date' ? maximumDate : undefined,
        onValueChange: (_event, selectedDate) => {
          if (selectedDate) onChange(selectedDate);
        },
      });
      return;
    }
    setIosPickerMode(mode);
  };

  return (
    <View style={styles.row}>
      <ThemedView type="backgroundSelected" style={styles.field}>
        <Pressable
          onPress={() => openPicker('date')}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText>{formatDisplayDate(value)}</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView type="backgroundSelected" style={styles.field}>
        <Pressable
          onPress={() => openPicker('time')}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText>{formatTimeOnly(value)}</ThemedText>
        </Pressable>
      </ThemedView>

      {Platform.OS === 'ios' && iosPickerMode && (
        <DateTimePicker
          value={value}
          mode={iosPickerMode}
          display="default"
          maximumDate={iosPickerMode === 'date' ? maximumDate : undefined}
          onValueChange={(_event, selectedDate) => {
            setIosPickerMode(null);
            if (selectedDate) onChange(selectedDate);
          }}
        />
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

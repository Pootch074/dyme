import { DatePickerDialog, Host, TimePickerDialog } from '@expo/ui/jetpack-compose';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { MATERIAL_SEED_COLOR } from './theme';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { toDateOnlyString } from '@/utils/date';

/**
 * Shows one of these dialogs from a React Native screen (e.g. the DTR form),
 * themed like the Compose screens. The dialog draws in its own window, so
 * the host itself takes no space.
 */
export function DialogHost({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  return (
    <Host colorScheme={colorScheme} seedColor={MATERIAL_SEED_COLOR} style={styles.host}>
      {children}
    </Host>
  );
}

/**
 * The Material 3 date picker works on UTC days, so a local YYYY-MM-DD goes in
 * as that day's UTC midnight and comes back out the same way.
 */
function toPickerMillisString(dateOnly: string): string {
  return `${dateOnly}T00:00:00.000Z`;
}

function fromPickerDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type DateDialogProps = {
  /** YYYY-MM-DD shown selected when the dialog opens. */
  value: string;
  /** Last pickable day (its calendar date; the time of day is ignored). */
  maximumDate?: Date;
  onSelect: (dateOnly: string) => void;
  onDismiss: () => void;
};

/** The app's date picker: a Material 3 calendar dialog. Render it only while open. */
export function DateDialog({ value, maximumDate, onSelect, onDismiss }: DateDialogProps) {
  return (
    <DatePickerDialog
      initialDate={toPickerMillisString(value)}
      // The end of the max day in the picker's UTC days, so that day stays pickable.
      selectableDates={
        maximumDate ? { end: new Date(`${toDateOnlyString(maximumDate)}T23:59:59.999Z`) } : undefined
      }
      onDateSelected={(date) => onSelect(fromPickerDate(date))}
      onDismissRequest={onDismiss}
    />
  );
}

type TimeDialogProps = {
  /** Time of day shown when the dialog opens. */
  value: Date;
  /** `value` with the picked hours and minutes (device-local time). */
  onSelect: (date: Date) => void;
  onDismiss: () => void;
};

/** The app's time picker: a Material 3 clock dialog with AM/PM. Render it only while open. */
export function TimeDialog({ value, onSelect, onDismiss }: TimeDialogProps) {
  return (
    <TimePickerDialog
      initialDate={value.toISOString()}
      is24Hour={false}
      onDateSelected={onSelect}
      onDismissRequest={onDismiss}
    />
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    width: 1,
    height: 1,
  },
});

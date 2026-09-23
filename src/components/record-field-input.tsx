import { Feather } from '@react-native-vector-icons/feather';
import { Pressable, StyleSheet, View } from 'react-native';

import { DateField } from './date-field';
import { DateTimeField } from './date-time-field';
import { FormInput } from './form-input';
import { ThemedText } from './themed-text';

import type { RecordField } from '@/constants/record-categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nowInPHT, parseDateOnly, toDateOnlyString } from '@/utils/date';

type RecordFieldInputProps = {
  field: RecordField;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
};

/** One labelled input in the Add / Edit Entry form, rendered according to the field's type. */
export function RecordFieldInput({ field, value, onChange, error }: RecordFieldInputProps) {
  const label = field.required ? `${field.label} *` : field.label;
  const accessibilityLabel = field.required ? `${field.label}, required` : field.label;

  return (
    <View style={styles.group}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <FieldControl
        field={field}
        value={value}
        onChange={onChange}
        invalid={Boolean(error)}
        accessibilityLabel={accessibilityLabel}
      />
      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

type FieldControlProps = {
  field: RecordField;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  accessibilityLabel: string;
};

function FieldControl({ field, value, onChange, invalid, accessibilityLabel }: FieldControlProps) {
  const theme = useTheme();

  switch (field.type) {
    case 'datetime': {
      const date = value ? new Date(value) : nowInPHT();
      return (
        <DateTimeField
          value={date}
          onChange={(next) => onChange(next.toISOString())}
          maximumDate={nowInPHT()}
        />
      );
    }

    case 'date':
      // Optional dates start empty; "Add date" fills in today, × clears it.
      if (!value) {
        return (
          <Pressable
            onPress={() => onChange(toDateOnlyString(nowInPHT()))}
            accessibilityRole="button"
            accessibilityLabel={`Add ${field.label.toLowerCase()}`}
            style={({ pressed }) => [
              styles.addDate,
              { borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <Feather name="calendar" size={16} color={theme.textSecondary} />
            <ThemedText themeColor="textSecondary">Add date</ThemedText>
          </Pressable>
        );
      }
      return (
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <DateField
              value={parseDateOnly(value)}
              onChange={(next) => onChange(toDateOnlyString(next))}
            />
          </View>
          <Pressable
            onPress={() => onChange('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${field.label.toLowerCase()}`}
            style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
            <Feather name="x" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
      );

    case 'choice':
      return (
        <View style={styles.choices} accessibilityRole="radiogroup">
          {(field.options ?? []).map((option) => {
            const isSelected = option === value;
            return (
              <Pressable
                key={option}
                // Tapping the selected option again clears it.
                onPress={() => onChange(isSelected ? '' : option)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                style={({ pressed }) => [
                  styles.choice,
                  { backgroundColor: theme.backgroundSelected },
                  isSelected && styles.choiceSelected,
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="small" style={isSelected && styles.choiceSelectedText}>
                  {option}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      );

    default:
      return (
        <FormInput
          value={value}
          onChangeText={onChange}
          placeholder={field.type === 'amount' ? '0.00' : field.label}
          accessibilityLabel={accessibilityLabel}
          keyboardType={
            field.keyboardType ??
            (field.type === 'amount'
              ? 'decimal-pad'
              : field.type === 'number'
                ? 'number-pad'
                : undefined)
          }
          multiline={field.type === 'multiline'}
          invalid={invalid}
        />
      );
  }
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.one,
  },
  label: {
    paddingHorizontal: Spacing.one,
  },
  addDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dateField: {
    flex: 1,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  choice: {
    borderRadius: Spacing.four,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  choiceSelected: {
    backgroundColor: '#3c87f7',
  },
  choiceSelectedText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
});

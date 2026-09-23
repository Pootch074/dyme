import {
  Column,
  DatePickerDialog,
  FilterChip,
  FlowRow,
  Icon,
  IconButton,
  OutlinedButton,
  Row,
  Spacer,
  Text,
  TimePickerDialog,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth, weight, width } from '@expo/ui/jetpack-compose/modifiers';
import { useState } from 'react';

import { Icons } from './icons';
import { ControlledTextField } from './text-field';
import { useAppMaterialColors } from './theme';

import type { RecordField } from '@/constants/record-categories';
import {
  formatDisplayDate,
  formatTimeOnly,
  nowInPHT,
  parseDateOnly,
  toDateOnlyString,
  withDatePart,
} from '@/utils/date';

type RecordFieldControlProps = {
  field: RecordField;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
};

// The Material date picker works in UTC days: it takes and returns the chosen
// day as UTC midnight, independent of the device timezone.
function toPickerMillisString(dateOnly: string): string {
  return `${dateOnly}T00:00:00.000Z`;
}

function fromPickerDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** One field of the Add / Edit Entry form as a Material 3 control, chosen by the field's type. */
export function RecordFieldControl({ field, value, onChange, error }: RecordFieldControlProps) {
  const label = field.required ? `${field.label} *` : field.label;

  switch (field.type) {
    case 'choice':
      return (
        <FieldGroup label={label} error={error}>
          <FlowRow
            horizontalArrangement={{ spacedBy: 8 }}
            modifiers={[fillMaxWidth()]}>
            {(field.options ?? []).map((option) => (
              <FilterChip
                key={option}
                selected={option === value}
                // Tapping the selected option again clears it.
                onClick={() => onChange(option === value ? '' : option)}>
                <FilterChip.Label>
                  <Text>{option}</Text>
                </FilterChip.Label>
              </FilterChip>
            ))}
          </FlowRow>
        </FieldGroup>
      );

    case 'date':
      return (
        <FieldGroup label={label} error={error}>
          <DateControl value={value} onChange={onChange} fieldLabel={field.label} />
        </FieldGroup>
      );

    case 'datetime':
      return (
        <FieldGroup label={label} error={error}>
          <DateTimeControl value={value} onChange={onChange} />
        </FieldGroup>
      );

    default:
      return (
        <ControlledTextField
          value={value}
          onChangeText={onChange}
          label={label}
          isError={Boolean(error)}
          supportingText={error}
          keyboardType={
            field.type === 'amount' ? 'decimal' : field.type === 'number' ? 'number' : 'text'
          }
          prefix={field.type === 'amount' ? '₱' : undefined}
          multiline={field.type === 'multiline'}
        />
      );
  }
}

type FieldGroupProps = {
  label: string;
  error?: string | null;
  children: React.ReactNode;
};

/** Label above, error below: the frame around non-text controls (chips, dates). */
function FieldGroup({ label, error, children }: FieldGroupProps) {
  const colors = useAppMaterialColors();

  return (
    <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
      <Text color={colors.onSurfaceVariant} style={{ typography: 'labelLarge' }}>
        {label}
      </Text>
      {children}
      {error ? (
        <Text color={colors.error} style={{ typography: 'bodySmall' }}>
          {error}
        </Text>
      ) : null}
    </Column>
  );
}

type DateControlProps = {
  /** YYYY-MM-DD, or '' when not set. */
  value: string;
  onChange: (value: string) => void;
  fieldLabel: string;
};

/** Optional date: a button that opens the Material date picker, plus × to clear. */
function DateControl({ value, onChange, fieldLabel }: DateControlProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const initial = value || toDateOnlyString(nowInPHT());

  return (
    <Row modifiers={[fillMaxWidth()]} verticalAlignment="center">
      <OutlinedButton onClick={() => setIsPickerOpen(true)} modifiers={[weight(1)]}>
        <Icon source={Icons.calendar} size={18} />
        <Spacer modifiers={[width(8)]} />
        <Text>{value ? formatDisplayDate(parseDateOnly(value)) : 'Add date'}</Text>
      </OutlinedButton>
      {value ? (
        <IconButton onClick={() => onChange('')}>
          <Icon source={Icons.close} contentDescription={`Clear ${fieldLabel.toLowerCase()}`} />
        </IconButton>
      ) : null}

      {isPickerOpen ? (
        <DatePickerDialog
          initialDate={toPickerMillisString(initial)}
          onDateSelected={(date) => {
            setIsPickerOpen(false);
            onChange(fromPickerDate(date));
          }}
          onDismissRequest={() => setIsPickerOpen(false)}
        />
      ) : null}
    </Row>
  );
}

type DateTimeControlProps = {
  /** ISO timestamp (always set for date-time fields). */
  value: string;
  onChange: (value: string) => void;
  /** Whether days after today can be picked (default: no). */
  allowFuture?: boolean;
};

/** Date + time buttons opening the Material date and time pickers. */
export function DateTimeControl({ value, onChange, allowFuture = false }: DateTimeControlProps) {
  const [openPicker, setOpenPicker] = useState<'date' | 'time' | null>(null);
  const date = value ? new Date(value) : nowInPHT();

  return (
    <Row modifiers={[fillMaxWidth()]} horizontalArrangement={{ spacedBy: 8 }}>
      <OutlinedButton onClick={() => setOpenPicker('date')} modifiers={[weight(1)]}>
        <Icon source={Icons.calendar} size={18} />
        <Spacer modifiers={[width(8)]} />
        <Text>{formatDisplayDate(date)}</Text>
      </OutlinedButton>
      <OutlinedButton onClick={() => setOpenPicker('time')} modifiers={[weight(1)]}>
        <Icon source={Icons.schedule} size={18} />
        <Spacer modifiers={[width(8)]} />
        <Text>{formatTimeOnly(date)}</Text>
      </OutlinedButton>

      {openPicker === 'date' ? (
        <DatePickerDialog
          initialDate={toPickerMillisString(toDateOnlyString(date))}
          selectableDates={allowFuture ? undefined : { end: nowInPHT() }}
          onDateSelected={(picked) => {
            setOpenPicker(null);
            onChange(withDatePart(date, fromPickerDate(picked)).toISOString());
          }}
          onDismissRequest={() => setOpenPicker(null)}
        />
      ) : null}
      {openPicker === 'time' ? (
        // The time picker works in device-local time and keeps the date part.
        <TimePickerDialog
          initialDate={date.toISOString()}
          onDateSelected={(picked) => {
            setOpenPicker(null);
            onChange(picked.toISOString());
          }}
          onDismissRequest={() => setOpenPicker(null)}
        />
      ) : null}
    </Row>
  );
}

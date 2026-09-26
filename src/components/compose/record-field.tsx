import {
  Column,
  DatePickerDialog,
  DropdownMenuItem,
  ExposedDropdownMenu,
  ExposedDropdownMenuBox,
  FilterChip,
  FlowRow,
  Icon,
  IconButton,
  OutlinedButton,
  Row,
  Spacer,
  Text,
  type TextFieldKeyboardType,
  TimePickerDialog,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth, menuAnchor, weight, width } from '@expo/ui/jetpack-compose/modifiers';
import { useState } from 'react';

import { Icons } from './icons';
import { ControlledTextField } from './text-field';
import { useAppMaterialColors } from './theme';

import type { RecordField } from '@/constants/record-categories';
import {
  formatDisplayDate,
  formatTimeOnly12h,
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

    case 'select':
      return (
        <SelectControl
          value={value}
          onChange={onChange}
          options={field.options ?? []}
          label={label}
          fieldLabel={field.label}
          error={error}
        />
      );

    default:
      return field.sensitive ? (
        <SecretControl field={field} value={value} onChange={onChange} label={label} error={error} />
      ) : (
        <ControlledTextField
          value={value}
          onChangeText={onChange}
          label={label}
          isError={Boolean(error)}
          supportingText={error}
          keyboardType={keyboardTypeFor(field)}
          exact={Boolean(field.format)}
          prefix={field.type === 'amount' ? '₱' : undefined}
          multiline={field.type === 'multiline'}
        />
      );
  }
}

function keyboardTypeFor(field: RecordField): TextFieldKeyboardType {
  if (field.type === 'amount') return 'decimal';
  if (field.type === 'number' || field.format === 'digits') return 'number';
  if (field.format === 'email') return 'email';
  if (field.format === 'phone') return 'phone';
  // Keeps the keyboard from learning or suggesting what's typed.
  if (field.sensitive) return 'password';
  return 'text';
}

type SecretControlProps = {
  field: RecordField;
  value: string;
  onChange: (value: string) => void;
  label: string;
  error?: string | null;
};

/** Text field that's masked by default, with an eye button to show what's typed. */
function SecretControl({ field, value, onChange, label, error }: SecretControlProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <ControlledTextField
      value={value}
      onChangeText={onChange}
      label={label}
      isError={Boolean(error)}
      supportingText={error}
      keyboardType={keyboardTypeFor(field)}
      exact
      masked={!revealed}
      trailing={
        <IconButton onClick={() => setRevealed((shown) => !shown)}>
          <Icon
            source={revealed ? Icons.visibilityOff : Icons.visibility}
            contentDescription={`${revealed ? 'Hide' : 'Show'} ${field.label.toLowerCase()}`}
          />
        </IconButton>
      }
    />
  );
}

type SelectControlProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  label: string;
  /** The field's name without the required marker, e.g. "ID/Document type". */
  fieldLabel: string;
  error?: string | null;
};

/**
 * Material exposed dropdown of `options`, plus "Other" for any value: it
 * reveals a text field below. Picking the selected option again clears it.
 */
function SelectControl({ value, onChange, options, label, fieldLabel, error }: SelectControlProps) {
  const [expanded, setExpanded] = useState(false);
  // A saved value that isn't one of the options is a custom one.
  const [isCustom, setIsCustom] = useState(() => value !== '' && !options.includes(value));

  const choose = (option: string) => {
    setExpanded(false);
    setIsCustom(false);
    onChange(option === value ? '' : option);
  };

  const chooseOther = () => {
    setExpanded(false);
    if (!isCustom) {
      setIsCustom(true);
      onChange('');
    }
  };

  return (
    <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
      <ExposedDropdownMenuBox expanded={expanded} onExpandedChange={setExpanded}>
        <ControlledTextField
          value={isCustom ? 'Other' : value}
          onChangeText={() => {}}
          label={label}
          readOnly
          isError={Boolean(error) && !isCustom}
          supportingText={isCustom ? undefined : error}
          trailing={<Icon source={Icons.arrowDropDown} />}
          modifiers={[menuAnchor(), fillMaxWidth()]}
        />
        <ExposedDropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)}>
          {options.map((option) => (
            <DropdownMenuItem key={option} onClick={() => choose(option)}>
              <DropdownMenuItem.Text>
                <Text>{option}</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={chooseOther}>
            <DropdownMenuItem.Text>
              <Text>Other (type it in)</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
        </ExposedDropdownMenu>
      </ExposedDropdownMenuBox>

      {isCustom ? (
        <ControlledTextField
          value={value}
          onChangeText={onChange}
          label={`Type the ${fieldLabel.toLowerCase()}`}
          isError={Boolean(error)}
          supportingText={error}
        />
      ) : null}
    </Column>
  );
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
        <Text>{formatTimeOnly12h(date)}</Text>
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
          is24Hour={false}
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

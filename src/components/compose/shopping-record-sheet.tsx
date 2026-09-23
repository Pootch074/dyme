import { Button, Column, ModalBottomSheet, Text } from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  imePadding,
  padding,
  verticalScroll,
} from '@expo/ui/jetpack-compose/modifiers';

import { DateTimeControl } from './record-field';
import { ControlledTextField } from './text-field';
import { useAppMaterialColors } from './theme';

import type { useShoppingRecordForm } from '@/hooks/use-shopping-record-form';

/** "New shopping" / "Edit shopping" bottom sheet: location, date & time, and an optional budget. */
export function ShoppingRecordSheet({ form }: { form: ReturnType<typeof useShoppingRecordForm> }) {
  const colors = useAppMaterialColors();

  return (
    <ModalBottomSheet onDismissRequest={form.close} skipPartiallyExpanded>
      <Column
        modifiers={[fillMaxWidth(), verticalScroll(), imePadding(), padding(24, 0, 24, 24)]}
        verticalArrangement={{ spacedBy: 16 }}>
        <Text style={{ typography: 'headlineSmall' }}>{form.title}</Text>
        <ControlledTextField
          value={form.location}
          onChangeText={form.setLocation}
          label="Location *"
          isError={form.locationError !== null}
          supportingText={form.locationError}
        />
        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
          <Text color={colors.onSurfaceVariant} style={{ typography: 'labelLarge' }}>
            Date & time
          </Text>
          <DateTimeControl value={form.dateTime} onChange={form.setDateTime} allowFuture />
        </Column>
        <ControlledTextField
          value={form.budget}
          onChangeText={form.setBudget}
          label="Budget"
          prefix="₱"
          keyboardType="decimal"
          isError={form.budgetError !== null}
          supportingText={form.budgetError ?? 'Optional. Leave empty for no budget.'}
        />
        <Button onClick={form.submit} modifiers={[fillMaxWidth()]}>
          <Text>{form.isEditing ? 'Save changes' : 'Create'}</Text>
        </Button>
      </Column>
    </ModalBottomSheet>
  );
}

import { StyleSheet, View } from 'react-native';

import { Button } from './button';
import { DateTimeField } from './date-time-field';
import { Dialog } from './dialog';
import { FormInput } from './form-input';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import type { useShoppingRecordForm } from '@/hooks/use-shopping-record-form';

/** "New shopping" / "Edit shopping" dialog: location, date & time, and an optional budget. */
export function ShoppingRecordDialog({ form }: { form: ReturnType<typeof useShoppingRecordForm> }) {
  return (
    <Dialog visible={form.isOpen} title={form.title} onClose={form.close}>
      <View style={styles.fieldGroup}>
        <ThemedText type="small" themeColor="textSecondary">
          Location *
        </ThemedText>
        <FormInput
          value={form.location}
          onChangeText={form.setLocation}
          placeholder="e.g. Gaisano Illustre"
          accessibilityLabel="Location, required"
          invalid={form.locationError !== null}
        />
        {form.locationError ? (
          <ThemedText type="small" themeColor="danger">
            {form.locationError}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="small" themeColor="textSecondary">
          Date & time
        </ThemedText>
        <DateTimeField
          value={new Date(form.dateTime)}
          onChange={(date) => form.setDateTime(date.toISOString())}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="small" themeColor="textSecondary">
          Budget (₱)
        </ThemedText>
        <FormInput
          value={form.budget}
          onChangeText={form.setBudget}
          placeholder="e.g. 5,000.00"
          accessibilityLabel="Budget, optional"
          keyboardType="decimal-pad"
          invalid={form.budgetError !== null}
        />
        <ThemedText
          type="small"
          themeColor={form.budgetError ? 'danger' : 'textSecondary'}
          accessibilityLiveRegion="polite">
          {form.budgetError ?? 'Optional. Leave empty for no budget.'}
        </ThemedText>
      </View>

      <Button label={form.isEditing ? 'Save changes' : 'Create'} onPress={form.submit} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: Spacing.one,
  },
});

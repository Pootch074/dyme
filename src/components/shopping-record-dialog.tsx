import { StyleSheet, View } from 'react-native';

import { Button } from './button';
import { DateTimeField } from './date-time-field';
import { Dialog } from './dialog';
import { FormInput } from './form-input';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import type { useShoppingRecordForm } from '@/hooks/use-shopping-record-form';

/** "New shopping" / "Edit shopping" dialog: location and date & time. */
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

      <Button label={form.isEditing ? 'Save changes' : 'Create'} onPress={form.submit} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: Spacing.one,
  },
});

import { Feather } from '@react-native-vector-icons/feather';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { ConfirmDialog, Dialog } from '@/components/dialog';
import { FormInput } from '@/components/form-input';
import { RowActionButton } from '@/components/row-action-button';
import { ShoppingRecordDialog } from '@/components/shopping-record-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useShoppingDetails } from '@/hooks/use-shopping-details';
import { useShoppingRecordForm } from '@/hooks/use-shopping-record-form';
import { useTheme } from '@/hooks/use-theme';
import { formatCentavos } from '@/utils/money';
import {
  budgetWarning,
  formatShoppingDateTime,
  itemTotal,
  type ShoppingItem,
} from '@/utils/shopping';

export type ShoppingDetailsScreenProps = {
  recordId: string;
};

export function ShoppingDetailsScreen({ recordId }: ShoppingDetailsScreenProps) {
  const details = useShoppingDetails(recordId);
  const recordForm = useShoppingRecordForm();
  const theme = useTheme();
  const { record, total, status } = details;

  if (!record) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.content]}>
          <BackButton />
          {!details.isLoading ? (
            <>
              <ThemedText type="subtitle">Shopping record not found</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                It may have been deleted. Go back to the Shopping Calculator.
              </ThemedText>
            </>
          ) : null}
        </SafeAreaView>
      </ThemedView>
    );
  }

  const warning = budgetWarning(status);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <BackButton />
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <ThemedText type="subtitle">{record.location}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatShoppingDateTime(new Date(record.dateTime))}
              </ThemedText>
            </View>
            <RowActionButton
              icon="edit-2"
              tooltip="Edit"
              accessibilityLabel="Edit shopping details"
              onPress={() => recordForm.open(record)}
            />
            <RowActionButton
              icon="trash-2"
              tooltip="Delete"
              tone="danger"
              accessibilityLabel="Delete shopping record"
              onPress={details.requestDeleteRecord}
            />
          </View>

          {/* Total expenses and the budget side by side when there's room, stacked on phones. */}
          <View style={styles.summary}>
            <ThemedView type="backgroundElement" style={styles.summaryCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Total expenses
              </ThemedText>
              <ThemedText style={styles.totalAmount}>{formatCentavos(total)}</ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.summaryCard}>
              <View style={styles.budgetRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Budget
                </ThemedText>
                <ThemedText type="smallBold">
                  {status.kind === 'none' ? 'Not set' : formatCentavos(status.budget)}
                </ThemedText>
              </View>
              {status.kind !== 'none' ? (
                <View style={styles.budgetRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {status.kind === 'over' ? 'Over budget' : 'Budget left'}
                  </ThemedText>
                  <ThemedText
                    type="smallBold"
                    themeColor={status.kind === 'under' ? 'text' : 'danger'}>
                    {formatCentavos(status.kind === 'over' ? status.over : status.left)}
                  </ThemedText>
                </View>
              ) : null}
              <Button
                label={status.kind === 'none' ? 'Set budget' : 'Edit budget'}
                variant="secondary"
                onPress={details.openBudget}
              />
            </ThemedView>
          </View>

          {warning ? (
            <View
              style={[styles.warning, { borderColor: theme.danger }]}
              accessibilityRole="alert">
              <Feather name="alert-triangle" size={18} color={theme.danger} />
              <ThemedText type="smallBold" themeColor="danger" style={styles.warningText}>
                {warning}
              </ThemedText>
            </View>
          ) : null}

          <Button label="Add an item" icon="plus" onPress={details.openAddItem} />

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.itemsHeader}>
            Items ({record.items.length})
          </ThemedText>
          {record.items.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyItems}>
              No items yet. Add what you bought and the total is calculated for you.
            </ThemedText>
          ) : (
            record.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={() => details.openEditItem(item)}
                onDelete={() => details.requestDeleteItem(item.id)}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <Dialog
        visible={details.itemDialog !== null}
        title={details.itemDialogTitle}
        subtitle={record.location}
        onClose={details.closeItemDialog}>
        <Field label="Product name *" error={details.itemErrors.name}>
          <FormInput
            value={details.name}
            onChangeText={details.setName}
            placeholder="e.g. Cooking oil"
            accessibilityLabel="Product name, required"
            invalid={Boolean(details.itemErrors.name)}
          />
        </Field>
        <View style={styles.fieldRow}>
          <Field label="Price (₱) *" error={details.itemErrors.price} style={styles.flex}>
            <FormInput
              value={details.price}
              onChangeText={details.setPrice}
              placeholder="0.00"
              accessibilityLabel="Price, required"
              keyboardType="decimal-pad"
              invalid={Boolean(details.itemErrors.price)}
            />
          </Field>
          <Field label="Quantity *" error={details.itemErrors.quantity} style={styles.flex}>
            <FormInput
              value={details.quantity}
              onChangeText={details.setQuantity}
              placeholder="1"
              accessibilityLabel="Quantity, required"
              keyboardType="number-pad"
              invalid={Boolean(details.itemErrors.quantity)}
            />
          </Field>
        </View>
        <ThemedView type="backgroundSelected" style={styles.liveTotal}>
          <ThemedText type="small" themeColor="textSecondary">
            Item total
          </ThemedText>
          <ThemedText type="smallBold">
            {details.liveItemTotal === null ? '—' : formatCentavos(details.liveItemTotal)}
          </ThemedText>
        </ThemedView>
        <View style={styles.fieldRow}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={details.closeItemDialog}
            style={styles.flex}
          />
          <Button label="Save" onPress={details.saveItem} style={styles.flex} />
        </View>
      </Dialog>

      <Dialog visible={details.isBudgetOpen} title="Budget" onClose={details.closeBudget}>
        <Field label="Budget (₱)" error={details.budgetError}>
          <FormInput
            value={details.budgetInput}
            onChangeText={details.setBudgetInput}
            placeholder="e.g. 5,000.00"
            accessibilityLabel="Budget"
            keyboardType="decimal-pad"
            invalid={Boolean(details.budgetError)}
          />
        </Field>
        <ThemedText type="small" themeColor="textSecondary">
          Leave empty to remove the budget.
        </ThemedText>
        <View style={styles.fieldRow}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={details.closeBudget}
            style={styles.flex}
          />
          <Button label="Save" onPress={details.saveBudget} style={styles.flex} />
        </View>
      </Dialog>

      <ConfirmDialog
        visible={details.pendingDeleteItem !== null}
        title="Delete item?"
        message={
          details.pendingDeleteItem
            ? `"${details.pendingDeleteItem.name}" will be removed from this shopping record.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={details.confirmDeleteItem}
        onCancel={details.cancelDeleteItem}
      />

      <ConfirmDialog
        visible={details.isDeleteRecordOpen}
        title="Delete shopping record?"
        message={`"${record.location}" and all its items will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={() => {
          // Leave first so this screen doesn't flash "not found".
          router.back();
          details.confirmDeleteRecord();
        }}
        onCancel={details.cancelDeleteRecord}
      />

      <ShoppingRecordDialog form={recordForm} />
    </ThemedView>
  );
}

type ItemRowProps = {
  item: ShoppingItem;
  onEdit: () => void;
  onDelete: () => void;
};

/** Product name, unit price × quantity, item total, and edit / delete actions. */
function ItemRow({ item, onEdit, onDelete }: ItemRowProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.itemRow}>
      <View style={styles.itemText}>
        <ThemedText style={styles.itemName} numberOfLines={2}>
          {item.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatCentavos(item.priceCentavos)} × {item.quantity}
        </ThemedText>
      </View>
      <ThemedText style={styles.itemTotal}>{formatCentavos(itemTotal(item))}</ThemedText>
      <View style={styles.itemActions}>
        <RowActionButton
          icon="edit-2"
          tooltip="Edit"
          accessibilityLabel={`Edit ${item.name}`}
          onPress={onEdit}
        />
        <RowActionButton
          icon="trash-2"
          tooltip="Delete"
          tone="danger"
          accessibilityLabel={`Delete ${item.name}`}
          onPress={onDelete}
        />
      </View>
    </ThemedView>
  );
}

type FieldProps = {
  label: string;
  error?: string | null;
  style?: object;
  children: React.ReactNode;
};

function Field({ label, error, style, children }: FieldProps) {
  return (
    <View style={[styles.field, style]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  titleText: {
    flex: 1,
    gap: Spacing.half,
  },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 240,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  totalAmount: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  warningText: {
    flex: 1,
  },
  itemsHeader: {
    marginTop: Spacing.two,
  },
  emptyItems: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    gap: Spacing.two,
  },
  itemText: {
    flex: 1,
    gap: Spacing.half,
  },
  itemName: {
    fontWeight: '600',
  },
  itemTotal: {
    fontWeight: '700',
  },
  itemActions: {
    flexDirection: 'row',
  },
  field: {
    gap: Spacing.one,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  liveTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  flex: {
    flex: 1,
  },
});

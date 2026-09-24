import { Feather } from '@react-native-vector-icons/feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionMenu } from '@/components/action-menu';
import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/dialog';
import { ItemEntryDialog } from '@/components/item-entry-dialog';
import { QuantityStepper } from '@/components/quantity-stepper';
import { RowActionButton } from '@/components/row-action-button';
import { ShoppingRecordDialog } from '@/components/shopping-record-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
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
        {/* Fixed top: header, totals and any budget warning stay in view while the items scroll. */}
        <View style={styles.pinnedTop}>
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

          {/* One compact row: Total items | Total expenses | Budget left, each
              centered in its cell. Cells are top-aligned so labels and values share
              a line; the budget's "of ₱…" caption hangs below its own cell. The
              budget is edited via Edit above. */}
          <ThemedView type="backgroundElement" style={styles.summary}>
            <Stat
              label="Total items"
              value={String(details.itemCount)}
              style={styles.statItems}
            />
            <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
            <Stat
              label="Total expenses"
              value={formatCentavos(total)}
              prominent
              style={styles.statMoney}
            />
            <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
            <Stat
              label={status.kind === 'over' ? 'Over budget' : 'Budget left'}
              value={
                status.kind === 'none'
                  ? 'Not set'
                  : formatCentavos(status.kind === 'over' ? status.over : status.left)
              }
              valueColor={status.kind === 'none' || status.kind === 'under' ? 'text' : 'danger'}
              caption={status.kind === 'none' ? undefined : `of ${formatCentavos(status.budget)}`}
              prominent
              style={styles.statMoney}
            />
          </ThemedView>

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

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.itemsHeader}>
            Items
          </ThemedText>
        </View>

        <ScrollView style={styles.itemsScroll} contentContainerStyle={styles.itemsList}>
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
                onQuantityChange={(quantity) => details.setItemQuantity(item.id, quantity)}
              />
            ))
          )}
        </ScrollView>

        {/* Fixed bottom: always reachable, whatever the scroll position. */}
        <View style={[styles.pinnedBottom, { borderTopColor: theme.backgroundSelected }]}>
          <Button label="Add an item" icon="plus" onPress={details.openAddItem} />
        </View>
      </SafeAreaView>

      <ItemEntryDialog details={details} subtitle={record.location} />

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

type StatProps = {
  label: string;
  value: string;
  valueColor?: ThemeColor;
  /** Larger value text, for the money figures. */
  prominent?: boolean;
  /** Small secondary line under the value, e.g. "of ₱5,000.00". */
  caption?: string;
  style?: object;
};

/** One labeled figure in the summary row, centered in its cell. */
function Stat({ label, value, valueColor = 'text', prominent = false, caption, style }: StatProps) {
  return (
    <View style={[styles.stat, style]}>
      <ThemedText themeColor="textSecondary" style={styles.statLabel} numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText
        themeColor={valueColor}
        style={[styles.statValue, prominent && styles.statValueProminent]}
        numberOfLines={1}>
        {value}
      </ThemedText>
      {caption ? (
        <ThemedText themeColor="textSecondary" style={styles.statLabel} numberOfLines={1}>
          {caption}
        </ThemedText>
      ) : null}
    </View>
  );
}

type ItemRowProps = {
  item: ShoppingItem;
  onEdit: () => void;
  onDelete: () => void;
  onQuantityChange: (quantity: number) => void;
};

/** Product name and unit price; item total over a −/+ quantity stepper; and a "⋮" menu for edit / delete. */
function ItemRow({ item, onEdit, onDelete, onQuantityChange }: ItemRowProps) {
  const theme = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <ThemedView type="backgroundElement" style={styles.itemRow}>
      <View style={styles.itemText}>
        <ThemedText style={styles.itemName} numberOfLines={2}>
          {item.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatCentavos(item.priceCentavos)} each
        </ThemedText>
      </View>

      <View style={styles.itemAmount}>
        <ThemedText style={styles.itemTotal} numberOfLines={1}>
          {formatCentavos(itemTotal(item))}
        </ThemedText>
        <QuantityStepper value={item.quantity} onChange={onQuantityChange} itemName={item.name} />
      </View>

      <Pressable
        onPress={() => setIsMenuOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`More actions for ${item.name}`}
        style={({ pressed }) => [
          styles.menuButton,
          pressed && { backgroundColor: theme.backgroundSelected },
        ]}>
        <Feather name="more-vertical" size={18} color={theme.textSecondary} />
      </Pressable>

      <ActionMenu
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        items={[
          { key: 'edit', label: 'Edit', icon: 'edit-2', onPress: onEdit },
          { key: 'delete', label: 'Delete', icon: 'trash-2', tone: 'danger', onPress: onDelete },
        ]}
      />
    </ThemedView>
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
  pinnedTop: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  itemsScroll: {
    flex: 1,
  },
  itemsList: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  pinnedBottom: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    alignItems: 'flex-start',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.one,
    gap: Spacing.two + Spacing.one,
  },
  stat: {
    alignItems: 'center',
    gap: Spacing.one,
    minWidth: 0,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    // Spans a cell's label + gap + value (16 + 4 + 26).
    height: 46,
  },
  statItems: {
    flex: 0.8,
  },
  statMoney: {
    flex: 1.1,
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    // Same for every value, whatever its size, so values share one line.
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  statValueProminent: {
    fontSize: 20,
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
  itemAmount: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  itemTotal: {
    fontWeight: '700',
    // Lines the total's right edge up with the + glyph, not its wider touch area.
    paddingRight: Spacing.one + Spacing.half,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

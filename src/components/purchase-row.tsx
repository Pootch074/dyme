import { StyleSheet, View } from 'react-native';

import { RowActionButton } from './row-action-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import type { Purchase } from '@/hooks/use-purchases';
import { formatDisplayDate, formatRelativeTime } from '@/utils/date';

type PurchaseRowProps = {
  purchase: Purchase;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
};

export function PurchaseRow({ purchase, onEdit, onRemove }: PurchaseRowProps) {
  const date = new Date(purchase.purchaseDate);
  const brandModel = [purchase.brand, purchase.model].filter(Boolean).join(' ');
  const quantityLabel = purchase.quantity > 1 ? `×${purchase.quantity}` : null;
  const detailLine = [brandModel, quantityLabel].filter(Boolean).join(' · ');

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.info}>
        <ThemedText numberOfLines={1} style={styles.name}>
          {purchase.productName}
        </ThemedText>
        {detailLine ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {detailLine}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {formatDisplayDate(date)} · {formatRelativeTime(date)}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <RowActionButton
          icon="edit-2"
          tooltip="Edit"
          accessibilityLabel={`Edit ${purchase.productName}`}
          onPress={() => onEdit(purchase.id)}
        />
        <RowActionButton
          icon="trash-2"
          tooltip="Remove"
          tone="danger"
          accessibilityLabel={`Remove ${purchase.productName}`}
          onPress={() => onRemove(purchase.id)}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
  name: {
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});

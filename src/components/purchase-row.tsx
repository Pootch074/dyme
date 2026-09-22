import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import type { Purchase } from '@/hooks/use-purchases';
import { formatDisplayDateTime, formatRelativeTime } from '@/utils/date';

type PurchaseRowProps = {
  purchase: Purchase;
  onRemove: (id: string) => void;
};

export function PurchaseRow({ purchase, onRemove }: PurchaseRowProps) {
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
          {formatDisplayDateTime(date)} · {formatRelativeTime(date)}
        </ThemedText>
      </View>

      <Pressable
        onPress={() => onRemove(purchase.id)}
        hitSlop={8}
        style={({ pressed }) => pressed && styles.pressed}
        accessibilityLabel={`Remove ${purchase.productName}`}>
        <ThemedText type="small" themeColor="textSecondary">
          Remove
        </ThemedText>
      </Pressable>
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
  pressed: {
    opacity: 0.6,
  },
});

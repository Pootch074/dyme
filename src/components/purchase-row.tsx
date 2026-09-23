import { Pressable, StyleSheet } from 'react-native';

import { RowActionButton } from './row-action-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import type { Purchase } from '@/hooks/use-purchases';

type PurchaseRowProps = {
  purchase: Purchase;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
};

/** Compact purchase row: just the name and a delete action. Tapping it opens the details dialog. */
export function PurchaseRow({ purchase, onOpen, onRemove }: PurchaseRowProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      {/* Fills the row beside the delete button; kept a sibling of it because
          nesting one pressable in another renders invalid <button>s on web. */}
      <Pressable
        onPress={() => onOpen(purchase.id)}
        accessibilityRole="button"
        accessibilityLabel={`View ${purchase.productName}`}
        style={({ pressed }) => [styles.openArea, pressed && styles.pressed]}>
        <ThemedText numberOfLines={1} style={styles.name}>
          {purchase.productName}
        </ThemedText>
      </Pressable>

      <RowActionButton
        icon="trash-2"
        tooltip="Remove"
        tone="danger"
        accessibilityLabel={`Remove ${purchase.productName}`}
        onPress={() => onRemove(purchase.id)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
  },
  openArea: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    marginVertical: -Spacing.two,
    paddingVertical: Spacing.two,
  },
  name: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});

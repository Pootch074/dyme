import { Feather, type FeatherIconName } from '@react-native-vector-icons/feather';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import type { Purchase } from '@/hooks/use-purchases';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDateTime, formatRelativeTime } from '@/utils/date';

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
          {formatDisplayDateTime(date)} · {formatRelativeTime(date)}
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

type RowActionButtonProps = {
  icon: FeatherIconName;
  tooltip: string;
  accessibilityLabel: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
};

/** Icon-only row action: subdued by default, revealed on hover/press with a tooltip. */
function RowActionButton({
  icon,
  tooltip,
  accessibilityLabel,
  tone = 'default',
  onPress,
}: RowActionButtonProps) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const active = hovered || pressed;
  const iconColor = active ? (tone === 'danger' ? theme.danger : theme.text) : theme.textSecondary;

  return (
    <View style={styles.actionWrapper}>
      <Pressable
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        delayHoverIn={400}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[styles.actionButton, active && { backgroundColor: theme.backgroundSelected }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </Pressable>

      {hovered ? (
        <View
          style={[styles.tooltip, { backgroundColor: theme.text }]}
          pointerEvents="none"
          aria-hidden>
          <ThemedText style={[styles.tooltipText, { color: theme.background }]}>{tooltip}</ThemedText>
        </View>
      ) : null}
    </View>
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
  actionWrapper: {
    position: 'relative',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    alignSelf: 'center',
    marginBottom: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  tooltipText: {
    fontSize: 12,
    lineHeight: 16,
  },
});

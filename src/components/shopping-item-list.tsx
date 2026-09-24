import { Feather } from '@react-native-vector-icons/feather';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ActionMenu } from './action-menu';
import { CartStatusButton } from './cart-status-button';
import { QuantityStepper } from './quantity-stepper';
import { ReorderableList } from './reorderable-list';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import type { useShoppingDetails } from '@/hooks/use-shopping-details';
import { useTheme } from '@/hooks/use-theme';
import { formatCentavos } from '@/utils/money';
import { itemTotal, type ShoppingItem } from '@/utils/shopping';

/** The app's blue accent, as on its primary buttons. */
const ACCENT = '#3c87f7';

type ShoppingItemListProps = {
  details: ReturnType<typeof useShoppingDetails>;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * A shopping record's items, scrolling. Press and hold an item to lift it,
 * then drag it to a new position; the order is saved with the record. Shared
 * by the iOS/web screen and (hosted inside Compose) the Android screen.
 */
export function ShoppingItemList({ details, style, contentContainerStyle }: ShoppingItemListProps) {
  return (
    <ReorderableList
      data={details.record?.items ?? []}
      keyExtractor={(item) => item.id}
      onReorder={details.moveItem}
      gap={Spacing.three}
      style={[styles.list, style]}
      contentContainerStyle={contentContainerStyle}
      emptyComponent={
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No items yet. Add what you plan to buy, then mark each one as it goes in your cart.
        </ThemedText>
      }
      renderItem={(item, { isActive }) => (
        <ShoppingItemRow
          item={item}
          isLifted={isActive}
          onEdit={() => details.openEditItem(item)}
          onDelete={() => details.requestDeleteItem(item.id)}
          onQuantityChange={(quantity) => details.setItemQuantity(item.id, quantity)}
          onInCartChange={(inCart) => details.setInCart(item.id, inCart)}
        />
      )}
    />
  );
}

type ShoppingItemRowProps = {
  item: ShoppingItem;
  /** Being dragged to a new position. */
  isLifted?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onQuantityChange: (quantity: number) => void;
  onInCartChange: (inCart: boolean) => void;
};

/**
 * One compact row: the cart-status icon; product name and unit price; item
 * total over a −/+ quantity stepper (down to 0); and a "⋮" menu for edit /
 * delete (plus "Mark not in cart" once the item is in the cart).
 */
function ShoppingItemRow({
  item,
  isLifted = false,
  onEdit,
  onDelete,
  onQuantityChange,
  onInCartChange,
}: ShoppingItemRowProps) {
  const theme = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.row,
        item.inCart && { borderColor: theme.success },
        isLifted && { borderColor: ACCENT },
      ]}>
      <CartStatusButton
        inCart={item.inCart}
        itemName={item.name}
        onConfirm={() => onInCartChange(true)}
      />

      <View style={styles.text}>
        <ThemedText style={styles.name} numberOfLines={2}>
          {item.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatCentavos(item.priceCentavos)} each
        </ThemedText>
      </View>

      <View style={styles.amount}>
        <ThemedText style={styles.total} numberOfLines={1}>
          {formatCentavos(itemTotal(item))}
        </ThemedText>
        <QuantityStepper
          value={item.quantity}
          onChange={onQuantityChange}
          itemName={item.name}
          min={0}
        />
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
          ...(item.inCart
            ? [
                {
                  key: 'not-in-cart',
                  label: 'Mark not in cart',
                  icon: 'rotate-ccw' as const,
                  onPress: () => onInCartChange(false),
                },
              ]
            : []),
          { key: 'edit', label: 'Edit', icon: 'edit-2', onPress: onEdit },
          { key: 'delete', label: 'Delete', icon: 'trash-2', tone: 'danger', onPress: onDelete },
        ]}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    // Always 1.5 wide (transparent until in cart) so confirming doesn't shift the layout.
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.two + Spacing.one,
    paddingRight: Spacing.one,
    gap: Spacing.two,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  name: {
    fontWeight: '600',
  },
  amount: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  total: {
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

import { Feather } from '@react-native-vector-icons/feather';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from './button';
import { Dialog } from './dialog';
import { FormInput } from './form-input';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import {
  PREVIOUS_PRODUCTS_EMPTY,
  PREVIOUS_PRODUCTS_HINT,
  type PreviousProductsPicker,
} from '@/hooks/use-previous-products';
import { useTheme } from '@/hooks/use-theme';
import { previousProductDetails, type PreviousProduct } from '@/utils/shopping';

/** The app's blue accent, as on its primary buttons. */
const ACCENT = '#3c87f7';

type PreviousProductsDialogProps = {
  picker: PreviousProductsPicker;
  subtitle?: string;
};

/**
 * "Previously purchased": tick products from earlier sessions (searchable
 * once there are many) and add them to this one in a single tap.
 */
export function PreviousProductsDialog({ picker, subtitle }: PreviousProductsDialogProps) {
  return (
    <Dialog
      visible={picker.isOpen}
      title="Previously purchased"
      subtitle={subtitle}
      onClose={picker.close}
      footer={
        picker.hasProducts ? (
          <Button
            label={picker.addLabel}
            icon="plus"
            disabled={picker.selectedCount === 0}
            onPress={picker.addSelected}
          />
        ) : undefined
      }>
      {!picker.hasProducts ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          {PREVIOUS_PRODUCTS_EMPTY}
        </ThemedText>
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {PREVIOUS_PRODUCTS_HINT}
          </ThemedText>
          {picker.showSearch ? (
            <FormInput
              value={picker.query}
              onChangeText={picker.setQuery}
              placeholder="Search products or stores"
              autoCorrect={false}
              returnKeyType="search"
            />
          ) : null}
          {picker.products.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No products match “{picker.query.trim()}”.
            </ThemedText>
          ) : (
            <View style={styles.list}>
              {picker.products.map((product) => (
                <ProductRow
                  key={product.key}
                  product={product}
                  selected={picker.isSelected(product.key)}
                  inList={picker.isInList(product.key)}
                  onToggle={() => picker.toggle(product.key)}
                />
              ))}
            </View>
          )}
        </>
      )}
    </Dialog>
  );
}

type ProductRowProps = {
  product: PreviousProduct;
  selected: boolean;
  /** Already on this shopping list: adding it again raises its quantity by one. */
  inList: boolean;
  onToggle: () => void;
};

function ProductRow({ product, selected, inList, onToggle }: ProductRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${product.name}, ${previousProductDetails(product)}${inList ? ', already in your list' : ''}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundSelected, borderColor: selected ? ACCENT : 'transparent' },
        pressed && styles.pressed,
      ]}>
      <Feather
        name={selected ? 'check-square' : 'square'}
        size={20}
        color={selected ? ACCENT : theme.textSecondary}
      />
      <View style={styles.text}>
        <ThemedText style={styles.name} numberOfLines={2}>
          {product.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {previousProductDetails(product)}
        </ThemedText>
        {inList ? (
          <ThemedText type="small" themeColor="success">
            In your list · adds 1 more
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  name: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});

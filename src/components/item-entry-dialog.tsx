import { Feather } from '@react-native-vector-icons/feather';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from './button';
import { Dialog } from './dialog';
import { FormInput } from './form-input';
import { NumberPad } from './number-pad';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import type { useShoppingDetails } from '@/hooks/use-shopping-details';
import { useTheme } from '@/hooks/use-theme';
import { formatTypedPrice, keyFromKeyboard } from '@/utils/keypad';
import { formatCentavos } from '@/utils/money';

type ItemEntryDialogProps = {
  details: ReturnType<typeof useShoppingDetails>;
  subtitle?: string;
};

const ACCENT = '#3c87f7';

/**
 * Add / Edit Item: price first on an on-screen number pad, quantity with −/+,
 * then the product name and Save. The number pad types into whichever of
 * price or quantity is highlighted.
 */
export function ItemEntryDialog({ details, subtitle }: ItemEntryDialogProps) {
  const theme = useTheme();
  const nameRef = useRef<TextInput>(null);
  const isOpen = details.itemDialog !== null;
  const { activeField, pressKey, saveItem } = details;
  const quantityNumber = /^\d+$/.test(details.quantity) ? Number(details.quantity) : 0;

  // Desktop / web: a physical keyboard drives the number pad too, except
  // while typing the product name. Enter saves.
  useEffect(() => {
    if (Platform.OS !== 'web' || !isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (activeField === 'name') return;
      if (event.key === 'Enter') {
        event.preventDefault();
        saveItem();
        return;
      }
      const key = keyFromKeyboard(event.key);
      if (key) {
        event.preventDefault();
        pressKey(key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, activeField, pressKey, saveItem]);

  // Tapping price or quantity takes focus back from the name field, so the
  // system keyboard closes and the number pad takes over.
  const activate = (field: 'price' | 'quantity') => {
    nameRef.current?.blur();
    details.setActiveField(field);
  };

  // The system keyboard covers the pad on phones while naming the item.
  const showPad = activeField !== 'name' || Platform.OS === 'web';

  return (
    <Dialog
      visible={isOpen}
      title={details.itemDialogTitle}
      subtitle={subtitle}
      onClose={details.closeItemDialog}
      closeOnBackdrop={false}>
      <View style={styles.quantityBlock}>
        <ThemedText type="small" themeColor="textSecondary">
          Quantity
        </ThemedText>
        <View style={styles.stepper}>
          <StepButton
            icon="minus"
            label="Decrease quantity"
            disabled={quantityNumber <= details.minQuantity}
            onPress={() => details.stepQuantity(-1)}
          />
          <Pressable
            onPress={() => activate('quantity')}
            accessibilityRole="button"
            accessibilityLabel={`Quantity ${details.quantity || 'empty'}, tap to type`}
            style={[
              styles.quantityBox,
              { borderColor: activeField === 'quantity' ? ACCENT : theme.backgroundSelected },
            ]}>
            <ThemedText style={styles.quantityText}>{details.quantity || ' '}</ThemedText>
          </Pressable>
          <StepButton icon="plus" label="Increase quantity" onPress={() => details.stepQuantity(1)} />
        </View>
        {details.itemErrors.quantity ? (
          <ThemedText type="small" themeColor="danger">
            {details.itemErrors.quantity}
          </ThemedText>
        ) : null}
      </View>

      <View>
        <Pressable
          onPress={() => activate('price')}
          accessibilityRole="button"
          accessibilityLabel={`Price ₱${formatTypedPrice(details.price)}, tap to type`}
          style={[
            styles.priceBox,
            {
              borderBottomColor: details.itemErrors.price
                ? theme.danger
                : activeField === 'price'
                  ? ACCENT
                  : theme.backgroundSelected,
            },
          ]}>
          <ThemedText style={styles.peso} themeColor="textSecondary">
            ₱
          </ThemedText>
          <ThemedText
            style={styles.priceText}
            themeColor={details.price ? 'text' : 'textSecondary'}
            numberOfLines={1}
            adjustsFontSizeToFit>
            {formatTypedPrice(details.price)}
          </ThemedText>
        </Pressable>
        <View style={styles.priceFooter}>
          <ThemedText type="small" themeColor="danger" style={styles.flex}>
            {details.itemErrors.price ?? ''}
          </ThemedText>
          {details.liveItemTotal !== null && quantityNumber > 1 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Item total {formatCentavos(details.liveItemTotal)}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View>
        <View style={styles.nameRow}>
          <View style={styles.flex}>
            <FormInput
              ref={nameRef}
              value={details.name}
              onChangeText={details.setName}
              onFocus={() => details.setActiveField('name')}
              placeholder="Product name"
              accessibilityLabel="Product name, required"
              invalid={Boolean(details.itemErrors.name)}
            />
          </View>
          <Button label="Save" onPress={saveItem} />
        </View>
        {details.itemErrors.name ? (
          <ThemedText type="small" themeColor="danger" style={styles.nameError}>
            {details.itemErrors.name}
          </ThemedText>
        ) : null}
      </View>

      {showPad ? (
        <NumberPad target={activeField === 'quantity' ? 'quantity' : 'price'} onKey={pressKey} />
      ) : null}
    </Dialog>
  );
}

type StepButtonProps = {
  icon: 'minus' | 'plus';
  label: string;
  disabled?: boolean;
  onPress: () => void;
};

function StepButton({ icon, label, disabled, onPress }: StepButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.stepButton,
        { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Feather name={icon} size={20} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  quantityBlock: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityBox: {
    minWidth: 72,
    height: 48,
    borderRadius: Spacing.two,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  quantityText: {
    fontSize: 22,
    fontWeight: '700',
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    borderBottomWidth: 2,
    paddingVertical: Spacing.one,
  },
  peso: {
    fontSize: 22,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    flexShrink: 1,
  },
  priceFooter: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
    minHeight: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  nameError: {
    marginTop: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.3,
  },
});

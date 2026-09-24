import { Feather } from '@react-native-vector-icons/feather';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PRIMARY = '#3c87f7';

type CartStatusButtonProps = {
  inCart: boolean;
  itemName: string;
  onConfirm: () => void;
};

/**
 * An item's cart status as a single round icon. Not in cart: an outlined cart
 * the shopper taps to confirm the item is in the cart. In cart: a filled green
 * check that does nothing when tapped, so it can't be confirmed twice (taking
 * it back out lives in the item's menu). A tooltip names it on hover.
 */
export function CartStatusButton({ inCart, itemName, onConfirm }: CartStatusButtonProps) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const active = !inCart && (hovered || pressed);

  const confirm = () => {
    onConfirm();
    AccessibilityInfo.announceForAccessibility(`${itemName} is in the cart.`);
  };

  return (
    <View style={[styles.wrapper, hovered && styles.wrapperRaised]}>
      <Pressable
        onPress={inCart ? undefined : confirm}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        delayHoverIn={400}
        hitSlop={6}
        accessibilityRole={inCart ? 'image' : 'button'}
        accessibilityLabel={inCart ? `${itemName} is in the cart` : `Mark ${itemName} in cart`}
        accessibilityHint={inCart ? undefined : 'Confirms you have put this item in your cart.'}
        style={[
          styles.circle,
          inCart
            ? { backgroundColor: theme.success, borderColor: theme.success }
            : {
                borderColor: active ? PRIMARY : theme.textSecondary,
                backgroundColor: active ? theme.backgroundSelected : 'transparent',
              },
        ]}>
        <Feather
          name={inCart ? 'check' : 'shopping-cart'}
          size={inCart ? 18 : 16}
          color={inCart ? theme.background : active ? PRIMARY : theme.textSecondary}
        />
      </Pressable>

      {hovered ? (
        <View
          style={[styles.tooltip, { backgroundColor: theme.text }]}
          pointerEvents="none"
          aria-hidden>
          <ThemedText style={[styles.tooltipText, { color: theme.background }]} numberOfLines={1}>
            {inCart ? 'In cart' : 'Mark in cart'}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  // Keeps the tooltip above the item text that follows it.
  wrapperRaised: {
    zIndex: 1,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Beside the icon rather than above it, so the first row's tooltip isn't
  // clipped by the top of the scrolling list.
  tooltip: {
    position: 'absolute',
    left: '100%',
    top: 6,
    marginLeft: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  tooltipText: {
    fontSize: 12,
    lineHeight: 16,
  },
});

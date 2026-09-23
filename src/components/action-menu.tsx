import { Feather, type FeatherIconName } from '@react-native-vector-icons/feather';
import { useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ActionMenuItem = {
  key: string;
  label: string;
  icon: FeatherIconName;
  tone?: 'default' | 'danger';
  onPress: () => void;
};

type ActionMenuProps = {
  visible: boolean;
  onClose: () => void;
  items: ActionMenuItem[];
};

/** Small centered menu for a "⋮" trigger — an icon + label row per action. */
export function ActionMenu({ visible, onClose, items }: ActionMenuProps) {
  const theme = useTheme();
  // iOS can't present a modal (e.g. the Edit dialog) while this one is still
  // dismissing, so there the chosen action waits for onDismiss.
  const pendingAction = useRef<(() => void) | null>(null);

  const choose = (action: () => void) => {
    if (Platform.OS === 'ios') {
      pendingAction.current = action;
      onClose();
    } else {
      onClose();
      action();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={() => {
        const action = pendingAction.current;
        pendingAction.current = null;
        action?.();
      }}>
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss menu"
        />
        <ThemedView type="backgroundElement" style={styles.menu}>
          {items.map((item, index) => (
            <Pressable
              key={item.key}
              onPress={() => choose(item.onPress)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.item,
                index > 0 && [styles.itemBorder, { borderTopColor: theme.backgroundSelected }],
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}>
              <Feather
                name={item.icon}
                size={18}
                color={item.tone === 'danger' ? theme.danger : theme.text}
              />
              <ThemedText type="smallBold" themeColor={item.tone === 'danger' ? 'danger' : 'text'}>
                {item.label}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menu: {
    width: '100%',
    maxWidth: 280,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  itemBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

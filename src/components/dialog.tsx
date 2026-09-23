import { Feather } from '@react-native-vector-icons/feather';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Button } from './button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DialogProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

/** Centered modal card with a title, close button and scrollable body. */
export function Dialog({ visible, title, subtitle, onClose, children }: DialogProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss dialog"
        />
        <ThemedView type="backgroundElement" style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText type="subtitle" numberOfLines={1}>
                {title}
              </ThemedText>
              {subtitle ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {subtitle}
                </ThemedText>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Small "are you sure?" dialog with Cancel and a red confirm button. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Dismiss dialog"
        />
        <ThemedView type="backgroundElement" style={styles.confirmDialog}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.confirmMessage}>
            {message}
          </ThemedText>
          <View style={styles.actions}>
            <Button label="Cancel" variant="secondary" onPress={onCancel} style={styles.flex} />
            <Button label={confirmLabel} variant="danger" onPress={onConfirm} style={styles.flex} />
          </View>
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
  dialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.three,
    paddingTop: 0,
    gap: Spacing.three,
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  confirmMessage: {
    marginBottom: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});

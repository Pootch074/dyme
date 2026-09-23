import { Pressable, StyleSheet } from 'react-native';

import { RowActionButton } from './row-action-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';

type RecordRowProps = {
  id: string;
  title: string;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
};

/** Compact record row: just the entry's name and a delete action. Tapping it opens the details dialog. */
export function RecordRow({ id, title, onOpen, onRemove }: RecordRowProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      {/* Fills the row beside the delete button; kept a sibling of it because
          nesting one pressable in another renders invalid <button>s on web. */}
      <Pressable
        onPress={() => onOpen(id)}
        accessibilityRole="button"
        accessibilityLabel={`View ${title}`}
        style={({ pressed }) => [styles.openArea, pressed && styles.pressed]}>
        <ThemedText numberOfLines={1} style={styles.name}>
          {title}
        </ThemedText>
      </Pressable>

      <RowActionButton
        icon="trash-2"
        tooltip="Remove"
        tone="danger"
        accessibilityLabel={`Remove ${title}`}
        onPress={() => onRemove(id)}
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

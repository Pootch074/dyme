import { Feather } from '@react-native-vector-icons/feather';
import { StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { ReorderableList } from './reorderable-list';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import type { useCategoryLayout } from '@/hooks/use-category-layout';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/date';

/** The app's blue accent, as on its primary buttons. */
const ACCENT = '#3c87f7';

type CategoryOrderListProps = {
  layout: ReturnType<typeof useCategoryLayout>;
  /** Whether the entry counts are still loading. */
  isLoadingCounts: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const entryCount = (count: number) => (count === 1 ? '1 entry' : `${count} entries`);

/**
 * Every record category, scrolling, in the Records grid's order. Press and
 * hold a row to lift it, then drag it to a new position (which switches the
 * grid to the custom order); the switch shows or hides it. Shared by the
 * iOS/web screen and (hosted inside Compose) the Android screen.
 */
export function CategoryOrderList({
  layout,
  isLoadingCounts,
  style,
  contentContainerStyle,
}: CategoryOrderListProps) {
  const theme = useTheme();

  return (
    <ReorderableList
      data={layout.categories}
      keyExtractor={(category) => category.id}
      onReorder={layout.moveCategory}
      gap={Spacing.two}
      style={[styles.list, style]}
      contentContainerStyle={contentContainerStyle}
      renderItem={(category, { isActive }) => {
        const visible = layout.isVisible(category.id);
        const modified = layout.sort === 'modified' ? layout.lastModified(category.id) : null;
        const details = [
          isLoadingCounts ? ' ' : entryCount(layout.counts.get(category.id) ?? 0),
          ...(modified ? [`changed ${formatRelativeTime(modified).toLowerCase()}`] : []),
          ...(visible ? [] : ['hidden']),
        ];

        return (
          <ThemedView
            type="backgroundElement"
            style={[styles.row, isActive && { borderColor: ACCENT }]}>
            <Feather
              name="menu"
              size={18}
              color={isActive ? ACCENT : theme.textSecondary}
              accessibilityLabel="Hold to drag"
            />
            <View style={[styles.text, !visible && styles.dimmed]}>
              <ThemedText numberOfLines={1} style={styles.name}>
                {category.emoji} {category.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {details.join(' · ')}
              </ThemedText>
            </View>
            <Switch
              value={visible}
              onValueChange={(next) => layout.setCategoryVisible(category.id, next)}
              trackColor={{ true: ACCENT }}
              accessibilityLabel={`Show ${category.label}`}
            />
          </ThemedView>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    // Always 1.5 wide (transparent until lifted) so lifting doesn't shift the layout.
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  dimmed: {
    opacity: 0.5,
  },
  name: {
    fontWeight: '600',
  },
});

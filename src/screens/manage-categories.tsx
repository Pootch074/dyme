import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { CategoryOrderList } from '@/components/category-order-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { CATEGORY_SORTS, useCategoryLayout } from '@/hooks/use-category-layout';
import { useRecords } from '@/hooks/use-records';

const ACCENT = '#3c87f7';

/** Records → Manage categories: sort, drag to reorder, and show or hide the grid's categories. */
export default function ManageCategoriesScreen() {
  const { entries, isLoading } = useRecords();
  const layout = useCategoryLayout(entries);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <ThemedText type="subtitle">Manage categories</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Hold and drag a category to move it. Hiding one keeps its entries.
          </ThemedText>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            Sort by
          </ThemedText>
          <View style={styles.segmented} accessibilityRole="radiogroup">
            {CATEGORY_SORTS.map((option) => {
              const isSelected = option.value === layout.sort;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => layout.setSort(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  style={({ pressed }) => [
                    styles.segment,
                    isSelected && styles.segmentSelected,
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="smallBold"
                    themeColor="textSecondary"
                    numberOfLines={1}
                    style={isSelected && styles.segmentSelectedText}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {layout.isLoading ? null : (
          <CategoryOrderList
            layout={layout}
            isLoadingCounts={isLoading}
            contentContainerStyle={styles.listContent}
          />
        )}

        {layout.hiddenCount > 0 ? (
          <View style={styles.footer}>
            <Button
              label={`Show all (${layout.hiddenCount} hidden)`}
              icon="eye"
              variant="secondary"
              onPress={layout.showAllCategories}
            />
          </View>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    padding: Spacing.four,
    paddingBottom: Spacing.three,
  },
  subtitle: {
    marginTop: Spacing.half,
  },
  sectionHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  segmented: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
  },
  segmentSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  segmentSelectedText: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});

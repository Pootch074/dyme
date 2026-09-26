import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { RowActionButton } from '@/components/row-action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RECORD_CATEGORIES } from '@/constants/record-categories';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCategoryVisibility } from '@/hooks/use-category-visibility';
import { useRecords } from '@/hooks/use-records';

const ACCENT = '#3c87f7';

const entryCount = (count: number) => (count === 1 ? '1 entry' : `${count} entries`);

export default function RecordsScreen() {
  const { entries, isLoading } = useRecords();
  const visibility = useCategoryVisibility();
  const [isManaging, setIsManaging] = useState(false);
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 4 : width >= 480 ? 3 : 2;

  const countByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
    return counts;
  }, [entries]);

  // Waits for the saved choices so hidden categories don't flash in.
  const categories = visibility.isLoading ? [] : visibility.visibleCategories;
  const openManager = () => setIsManaging(true);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <BackButton />
          <View style={styles.titleRow}>
            <ThemedText type="subtitle" style={styles.title}>
              Records
            </ThemedText>
            <RowActionButton
              icon="sliders"
              tooltip="Show / hide categories"
              accessibilityLabel="Show or hide categories"
              onPress={openManager}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText}>
            Keep track of your important personal records
          </ThemedText>

          <View style={styles.grid}>
            {categories.map((category) => {
              const count = countByCategory.get(category.id) ?? 0;
              return (
                <Link
                  key={category.id}
                  href={{ pathname: '/records/[category]', params: { category: category.id } }}
                  asChild>
                  <Pressable
                    accessibilityLabel={`${category.label}, ${entryCount(count)}`}
                    style={({ pressed }) => [
                      styles.cardWrapper,
                      { width: `${100 / columns}%` },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedView type="backgroundElement" style={styles.card}>
                      <ThemedText style={styles.emoji}>{category.emoji}</ThemedText>
                      <ThemedText style={styles.cardLabel} numberOfLines={2}>
                        {category.label}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {isLoading ? ' ' : entryCount(count)}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                </Link>
              );
            })}
          </View>

          {!visibility.isLoading && categories.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                All categories are hidden. Your entries are still saved.
              </ThemedText>
              <Button label="Show categories" icon="eye" onPress={openManager} />
            </View>
          ) : visibility.hiddenCount > 0 ? (
            <Pressable
              onPress={openManager}
              accessibilityRole="button"
              style={({ pressed }) => [styles.hiddenNote, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                {visibility.hiddenCount === 1
                  ? '1 hidden category · '
                  : `${visibility.hiddenCount} hidden categories · `}
                <ThemedText type="smallBold" style={styles.link}>
                  Manage
                </ThemedText>
              </ThemedText>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <Dialog
        visible={isManaging}
        title="Show categories"
        subtitle="Hiding a category keeps its entries."
        onClose={() => setIsManaging(false)}>
        {RECORD_CATEGORIES.map((category) => (
          <ThemedView key={category.id} type="backgroundSelected" style={styles.switchRow}>
            <ThemedText style={styles.switchEmoji}>{category.emoji}</ThemedText>
            <View style={styles.switchText}>
              <ThemedText style={styles.cardLabel} numberOfLines={1}>
                {category.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isLoading ? ' ' : entryCount(countByCategory.get(category.id) ?? 0)}
              </ThemedText>
            </View>
            <Switch
              value={visibility.isVisible(category.id)}
              onValueChange={(visible) => visibility.setCategoryVisible(category.id, visible)}
              trackColor={{ true: ACCENT }}
              accessibilityLabel={`Show ${category.label}`}
            />
          </ThemedView>
        ))}
        {visibility.hiddenCount > 0 ? (
          <Button
            label="Show all"
            icon="eye"
            variant="secondary"
            onPress={visibility.showAllCategories}
          />
        ) : null}
      </Dialog>
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
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  subtitleText: {
    marginTop: Spacing.half,
    marginBottom: Spacing.four,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.one,
  },
  cardWrapper: {
    padding: Spacing.one,
  },
  card: {
    flex: 1,
    minHeight: 120,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  emoji: {
    fontSize: 28,
    lineHeight: 36,
  },
  cardLabel: {
    fontWeight: '600',
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  hiddenNote: {
    alignSelf: 'center',
    marginTop: Spacing.three,
    padding: Spacing.two,
  },
  link: {
    color: ACCENT,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  switchEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  switchText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});

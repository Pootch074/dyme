import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { RowActionButton } from '@/components/row-action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCategoryLayout } from '@/hooks/use-category-layout';
import { useRecords } from '@/hooks/use-records';

const ACCENT = '#3c87f7';

const entryCount = (count: number) => (count === 1 ? '1 entry' : `${count} entries`);

const openManager = () => router.push('/records/manage');

export default function RecordsScreen() {
  const { entries, isLoading } = useRecords();
  const layout = useCategoryLayout(entries);
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 4 : width >= 480 ? 3 : 2;

  // Waits for the saved layout so hidden or moved categories don't flash in.
  const categories = layout.isLoading ? [] : layout.visibleCategories;

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
              icon="upload"
              tooltip="Import & export"
              accessibilityLabel="Import and export records"
              onPress={() => router.push('/records/transfer')}
            />
            <RowActionButton
              icon="sliders"
              tooltip="Manage categories"
              accessibilityLabel="Manage categories"
              onPress={openManager}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText}>
            Keep track of your important personal records
          </ThemedText>

          <View style={styles.grid}>
            {categories.map((category) => {
              const count = layout.counts.get(category.id) ?? 0;
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

          {!layout.isLoading && categories.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                All categories are hidden. Your entries are still saved.
              </ThemedText>
              <Button label="Manage categories" icon="sliders" onPress={openManager} />
            </View>
          ) : layout.hiddenCount > 0 ? (
            <Pressable
              onPress={openManager}
              accessibilityRole="button"
              style={({ pressed }) => [styles.hiddenNote, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                {layout.hiddenCount === 1
                  ? '1 hidden category · '
                  : `${layout.hiddenCount} hidden categories · `}
                <ThemedText type="smallBold" style={styles.link}>
                  Manage
                </ThemedText>
              </ThemedText>
            </Pressable>
          ) : null}
        </ScrollView>
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
  pressed: {
    opacity: 0.7,
  },
});

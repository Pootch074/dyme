import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RECORD_CATEGORIES } from '@/constants/record-categories';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useRecords } from '@/hooks/use-records';

export default function RecordsScreen() {
  const { entries, isLoading } = useRecords();
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 4 : width >= 480 ? 3 : 2;

  const countByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
    return counts;
  }, [entries]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <BackButton />
          <ThemedText type="subtitle">Records</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText}>
            Keep track of your important personal records
          </ThemedText>

          <View style={styles.grid}>
            {RECORD_CATEGORIES.map((category) => {
              const count = countByCategory.get(category.id) ?? 0;
              return (
                <Link
                  key={category.id}
                  href={{ pathname: '/records/[category]', params: { category: category.id } }}
                  asChild>
                  <Pressable
                    accessibilityLabel={`${category.label}, ${count} ${count === 1 ? 'entry' : 'entries'}`}
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
                        {isLoading ? ' ' : count === 1 ? '1 entry' : `${count} entries`}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                </Link>
              );
            })}
          </View>
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
  pressed: {
    opacity: 0.7,
  },
});

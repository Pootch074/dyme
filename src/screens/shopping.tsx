import { Feather } from '@react-native-vector-icons/feather';
import { type Href, router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { ShoppingRecordDialog } from '@/components/shopping-record-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useShopping } from '@/hooks/use-shopping';
import { useShoppingRecordForm } from '@/hooks/use-shopping-record-form';
import { useTheme } from '@/hooks/use-theme';
import { formatCentavos } from '@/utils/money';
import {
  formatShoppingDate,
  formatShoppingTime,
  groupByMonth,
  recordTotal,
  type ShoppingRecord,
} from '@/utils/shopping';

function openRecord(id: string) {
  router.push(`/shopping/${id}` as Href);
}

export default function ShoppingScreen() {
  const { records, isLoading } = useShopping();
  const theme = useTheme();
  const form = useShoppingRecordForm(openRecord);
  const sections = useMemo(() => groupByMonth(records), [records]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ShoppingRow record={item} />}
          renderSectionHeader={({ section }) => (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <BackButton />
              <ThemedText type="subtitle">Shopping Calculator</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText}>
                Record your shopping and keep an eye on your budget.
              </ThemedText>
            </>
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Feather name="shopping-cart" size={32} color={theme.textSecondary} />
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  No shopping records yet. Start one to add items and track your total.
                </ThemedText>
                <Button label="New shopping" icon="plus" onPress={() => form.open()} />
              </View>
            ) : null
          }
        />

        <Pressable
          onPress={() => form.open()}
          accessibilityRole="button"
          accessibilityLabel="New shopping"
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
          <Feather name="plus" size={26} color="#ffffff" />
        </Pressable>
      </SafeAreaView>

      <ShoppingRecordDialog form={form} />
    </ThemedView>
  );
}

/** One shopping session: location, date, time and total expenses. */
function ShoppingRow({ record }: { record: ShoppingRecord }) {
  const date = new Date(record.dateTime);

  return (
    <Pressable
      onPress={() => openRecord(record.id)}
      accessibilityRole="button"
      accessibilityLabel={`${record.location}, ${formatCentavos(recordTotal(record))}`}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <View style={styles.rowText}>
          <ThemedText style={styles.rowTitle} numberOfLines={1}>
            {record.location}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatShoppingDate(date, false)} · {formatShoppingTime(date)}
          </ThemedText>
        </View>
        <ThemedText style={styles.rowTotal}>{formatCentavos(recordTotal(record))}</ThemedText>
      </ThemedView>
    </Pressable>
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
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.two,
  },
  subtitleText: {
    marginTop: Spacing.half,
    marginBottom: Spacing.two,
  },
  sectionHeader: {
    marginTop: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  rowTitle: {
    fontWeight: '600',
  },
  rowTotal: {
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  emptyText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.three,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 4, color: 'rgba(0, 0, 0, 0.25)' }],
  },
  fabPressed: {
    opacity: 0.85,
  },
});

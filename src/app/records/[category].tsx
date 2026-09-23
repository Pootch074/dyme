import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getRecordCategory } from '@/constants/record-categories';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { RecordCategoryScreen } from '@/screens/record-category';

export default function RecordCategoryRoute() {
  const { category: categoryParam } = useLocalSearchParams<{ category: string }>();
  const category = getRecordCategory(categoryParam ?? '');

  if (!category) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <BackButton />
          <ThemedText type="subtitle">Category not found</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Go back and pick a category from Records.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return <RecordCategoryScreen category={category} />;
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
    padding: Spacing.four,
    gap: Spacing.one,
  },
});

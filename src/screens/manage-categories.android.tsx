import {
  Box,
  Column,
  Icon,
  OutlinedButton,
  RNHostView,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Spacer,
  Surface,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  fillMaxWidth,
  padding,
  weight,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CategoryOrderList } from '@/components/category-order-list';
import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader, SectionLabel } from '@/components/compose/screen';
import { useAppMaterialColors } from '@/components/compose/theme';
import { CATEGORY_SORTS, useCategoryLayout } from '@/hooks/use-category-layout';
import { useRecords } from '@/hooks/use-records';

/** Records → Manage categories: sort, drag to reorder, and show or hide the grid's categories. */
export default function ManageCategoriesScreen() {
  const { entries, isLoading } = useRecords();
  const layout = useCategoryLayout(entries);
  const colors = useAppMaterialColors();

  return (
    <ComposeScreen>
      <Column modifiers={[fillMaxSize()]}>
        {/* Fixed top: the header and sort choice stay in view while the list scrolls. */}
        <Column
          modifiers={[fillMaxWidth(), padding(16, 16, 16, 12)]}
          verticalArrangement={{ spacedBy: 16 }}>
          <ScreenHeader
            title="Manage categories"
            subtitle="Hold and drag a category to move it. Hiding one keeps its entries."
            onBack={() => router.back()}
          />
          <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
            <SectionLabel>Sort by</SectionLabel>
            <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
              {CATEGORY_SORTS.map((option) => (
                <SegmentedButton
                  key={option.value}
                  selected={option.value === layout.sort}
                  onClick={() => layout.setSort(option.value)}>
                  <SegmentedButton.Label>
                    <Text maxLines={1}>{option.label}</Text>
                  </SegmentedButton.Label>
                </SegmentedButton>
              ))}
            </SingleChoiceSegmentedButtonRow>
          </Column>
        </Column>

        {/* React Native views hosted in Compose, because dragging a row needs
            gestures Compose here can't track (as on the shopping details
            screen). The Box takes the space left over: RNHostView always fills
            its parent and ignores a weight. */}
        <Box modifiers={[fillMaxWidth(), weight(1)]}>
          {layout.isLoading ? null : (
            <RNHostView>
              <View style={styles.fill}>
                <CategoryOrderList
                  layout={layout}
                  isLoadingCounts={isLoading}
                  contentContainerStyle={styles.listContent}
                />
              </View>
            </RNHostView>
          )}
        </Box>

        {layout.hiddenCount > 0 ? (
          <Surface color={colors.surfaceContainer} modifiers={[fillMaxWidth()]}>
            <OutlinedButton
              onClick={layout.showAllCategories}
              modifiers={[fillMaxWidth(), padding(16, 12, 16, 12)]}>
              <Icon source={Icons.visibility} size={18} />
              <Spacer modifiers={[width(8)]} />
              <Text>{`Show all (${layout.hiddenCount} hidden)`}</Text>
            </OutlinedButton>
          </Surface>
        ) : null}
      </Column>
    </ComposeScreen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

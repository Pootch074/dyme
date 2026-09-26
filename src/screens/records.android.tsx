import {
  Card,
  Column,
  Icon,
  IconButton,
  ListItem,
  ModalBottomSheet,
  OutlinedButton,
  Row,
  Spacer,
  Switch,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import {
  clickable,
  clip,
  fillMaxSize,
  fillMaxWidth,
  padding,
  paddingAll,
  Shapes,
  verticalScroll,
  weight,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader } from '@/components/compose/screen';
import { useAppMaterialColors } from '@/components/compose/theme';
import { RECORD_CATEGORIES, type RecordCategory } from '@/constants/record-categories';
import { useCategoryVisibility } from '@/hooks/use-category-visibility';
import { useRecords } from '@/hooks/use-records';

const COLUMNS = 2;

const TRANSPARENT = '#00000000';

const entryCount = (count: number) => (count === 1 ? '1 entry' : `${count} entries`);

export default function RecordsScreen() {
  const { entries, isLoading } = useRecords();
  const visibility = useCategoryVisibility();
  const [isManaging, setIsManaging] = useState(false);
  const colors = useAppMaterialColors();

  const countByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
    return counts;
  }, [entries]);

  // Waits for the saved choices so hidden categories don't flash in.
  const categories = visibility.isLoading ? [] : visibility.visibleCategories;
  const rows: RecordCategory[][] = [];
  for (let i = 0; i < categories.length; i += COLUMNS) {
    rows.push(categories.slice(i, i + COLUMNS));
  }

  return (
    <ComposeScreen>
      <Column
        modifiers={[fillMaxSize(), verticalScroll(), paddingAll(16)]}
        verticalArrangement={{ spacedBy: 16 }}>
        <ScreenHeader
          title="Records"
          subtitle="Keep track of your important personal records"
          onBack={() => router.back()}
          action={
            <IconButton onClick={() => setIsManaging(true)}>
              <Icon source={Icons.visibility} contentDescription="Show or hide categories" />
            </IconButton>
          }
        />

        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 12 }}>
          {rows.map((row) => (
            <Row
              key={row[0].id}
              modifiers={[fillMaxWidth()]}
              horizontalArrangement={{ spacedBy: 12 }}>
              {row.map((category) => {
                const count = countByCategory.get(category.id) ?? 0;
                return (
                  <Card
                    key={category.id}
                    modifiers={[
                      weight(1),
                      clip(Shapes.RoundedCorner(12)),
                      clickable(() =>
                        router.push({
                          pathname: '/records/[category]',
                          params: { category: category.id },
                        })
                      ),
                    ]}>
                    <Column modifiers={[paddingAll(16)]} verticalArrangement={{ spacedBy: 4 }}>
                      <Text style={{ fontSize: 28 }}>{category.emoji}</Text>
                      {/* Two lines for every label keeps the cards in a row the same height. */}
                      <Text style={{ typography: 'titleMedium' }} minLines={2} maxLines={2}>
                        {category.label}
                      </Text>
                      <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
                        {isLoading ? ' ' : entryCount(count)}
                      </Text>
                    </Column>
                  </Card>
                );
              })}
              {/* Keeps a lone last card at half width. */}
              {row.length < COLUMNS ? <Spacer modifiers={[weight(1)]} /> : null}
            </Row>
          ))}
        </Column>

        {!visibility.isLoading && categories.length === 0 ? (
          <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 12 }}>
            <Text
              color={colors.onSurfaceVariant}
              style={{ typography: 'bodyMedium', textAlign: 'center' }}
              modifiers={[fillMaxWidth()]}>
              All categories are hidden. Your entries are still saved.
            </Text>
            <OutlinedButton onClick={() => setIsManaging(true)} modifiers={[fillMaxWidth()]}>
              <Icon source={Icons.visibility} size={18} />
              <Spacer modifiers={[width(8)]} />
              <Text>Show categories</Text>
            </OutlinedButton>
          </Column>
        ) : visibility.hiddenCount > 0 ? (
          <TextButton onClick={() => setIsManaging(true)} modifiers={[fillMaxWidth()]}>
            <Text>
              {visibility.hiddenCount === 1
                ? '1 hidden category · Manage'
                : `${visibility.hiddenCount} hidden categories · Manage`}
            </Text>
          </TextButton>
        ) : null}
      </Column>

      {isManaging ? (
        <CategoryVisibilitySheet
          visibility={visibility}
          countFor={(id) => (isLoading ? ' ' : entryCount(countByCategory.get(id) ?? 0))}
          onClose={() => setIsManaging(false)}
        />
      ) : null}
    </ComposeScreen>
  );
}

type CategoryVisibilitySheetProps = {
  visibility: ReturnType<typeof useCategoryVisibility>;
  countFor: (id: string) => string;
  onClose: () => void;
};

/** Bottom sheet with a switch per category for showing or hiding it on the grid. */
function CategoryVisibilitySheet({ visibility, countFor, onClose }: CategoryVisibilitySheetProps) {
  const colors = useAppMaterialColors();

  return (
    <ModalBottomSheet onDismissRequest={onClose} skipPartiallyExpanded>
      <Column
        modifiers={[fillMaxWidth(), verticalScroll(), padding(24, 0, 24, 24)]}
        verticalArrangement={{ spacedBy: 8 }}>
        <Row modifiers={[fillMaxWidth()]} verticalAlignment="center">
          <Column modifiers={[weight(1)]}>
            <Text style={{ typography: 'headlineSmall' }}>Show categories</Text>
            <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
              Hiding a category keeps its entries.
            </Text>
          </Column>
          <IconButton onClick={onClose}>
            <Icon source={Icons.close} contentDescription="Close" />
          </IconButton>
        </Row>

        {RECORD_CATEGORIES.map((category) => (
          <ListItem key={category.id} colors={{ containerColor: TRANSPARENT }}>
            <ListItem.LeadingContent>
              <Text style={{ fontSize: 24 }}>{category.emoji}</Text>
            </ListItem.LeadingContent>
            <ListItem.HeadlineContent>
              <Text style={{ typography: 'titleMedium' }}>{category.label}</Text>
            </ListItem.HeadlineContent>
            <ListItem.SupportingContent>
              <Text>{countFor(category.id)}</Text>
            </ListItem.SupportingContent>
            <ListItem.TrailingContent>
              <Switch
                value={visibility.isVisible(category.id)}
                onCheckedChange={(visible) => visibility.setCategoryVisible(category.id, visible)}
              />
            </ListItem.TrailingContent>
          </ListItem>
        ))}

        {visibility.hiddenCount > 0 ? (
          <OutlinedButton onClick={visibility.showAllCategories} modifiers={[fillMaxWidth()]}>
            <Icon source={Icons.visibility} size={18} />
            <Spacer modifiers={[width(8)]} />
            <Text>Show all</Text>
          </OutlinedButton>
        ) : null}
      </Column>
    </ModalBottomSheet>
  );
}

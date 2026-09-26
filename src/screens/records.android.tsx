import {
  Card,
  Column,
  Icon,
  IconButton,
  OutlinedButton,
  Row,
  Spacer,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import {
  clickable,
  clip,
  fillMaxSize,
  fillMaxWidth,
  paddingAll,
  Shapes,
  verticalScroll,
  weight,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';

import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader } from '@/components/compose/screen';
import { useAppMaterialColors } from '@/components/compose/theme';
import type { RecordCategory } from '@/constants/record-categories';
import { useCategoryLayout } from '@/hooks/use-category-layout';
import { useRecords } from '@/hooks/use-records';

const COLUMNS = 2;

const entryCount = (count: number) => (count === 1 ? '1 entry' : `${count} entries`);

const openManager = () => router.push('/records/manage');

export default function RecordsScreen() {
  const { entries, isLoading } = useRecords();
  const layout = useCategoryLayout(entries);
  const colors = useAppMaterialColors();

  // Waits for the saved layout so hidden or moved categories don't flash in.
  const categories = layout.isLoading ? [] : layout.visibleCategories;
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
            <Row>
              <IconButton onClick={() => router.push('/records/transfer')}>
                <Icon source={Icons.upload} contentDescription="Import and export records" />
              </IconButton>
              <IconButton onClick={openManager}>
                <Icon source={Icons.visibility} contentDescription="Manage categories" />
              </IconButton>
            </Row>
          }
        />

        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 12 }}>
          {rows.map((row) => (
            <Row
              key={row[0].id}
              modifiers={[fillMaxWidth()]}
              horizontalArrangement={{ spacedBy: 12 }}>
              {row.map((category) => {
                const count = layout.counts.get(category.id) ?? 0;
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

        {!layout.isLoading && categories.length === 0 ? (
          <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 12 }}>
            <Text
              color={colors.onSurfaceVariant}
              style={{ typography: 'bodyMedium', textAlign: 'center' }}
              modifiers={[fillMaxWidth()]}>
              All categories are hidden. Your entries are still saved.
            </Text>
            <OutlinedButton onClick={openManager} modifiers={[fillMaxWidth()]}>
              <Icon source={Icons.visibility} size={18} />
              <Spacer modifiers={[width(8)]} />
              <Text>Manage categories</Text>
            </OutlinedButton>
          </Column>
        ) : layout.hiddenCount > 0 ? (
          <TextButton onClick={openManager} modifiers={[fillMaxWidth()]}>
            <Text>
              {layout.hiddenCount === 1
                ? '1 hidden category · Manage'
                : `${layout.hiddenCount} hidden categories · Manage`}
            </Text>
          </TextButton>
        ) : null}
      </Column>
    </ComposeScreen>
  );
}

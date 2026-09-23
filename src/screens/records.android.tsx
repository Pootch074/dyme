import { Card, Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  clickable,
  clip,
  fillMaxSize,
  fillMaxWidth,
  paddingAll,
  Shapes,
  verticalScroll,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';
import { useMemo } from 'react';

import { ComposeScreen, ScreenHeader } from '@/components/compose/screen';
import { useAppMaterialColors } from '@/components/compose/theme';
import { RECORD_CATEGORIES, type RecordCategory } from '@/constants/record-categories';
import { useRecords } from '@/hooks/use-records';

const COLUMNS = 2;

export default function RecordsScreen() {
  const { entries, isLoading } = useRecords();
  const colors = useAppMaterialColors();

  const countByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
    return counts;
  }, [entries]);

  const rows: RecordCategory[][] = [];
  for (let i = 0; i < RECORD_CATEGORIES.length; i += COLUMNS) {
    rows.push(RECORD_CATEGORIES.slice(i, i + COLUMNS));
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
                        {isLoading ? ' ' : count === 1 ? '1 entry' : `${count} entries`}
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
      </Column>
    </ComposeScreen>
  );
}

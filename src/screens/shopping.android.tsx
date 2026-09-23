import {
  Box,
  Button,
  Card,
  Column,
  ExtendedFloatingActionButton,
  Icon,
  LazyColumn,
  ListItem,
  Spacer,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  align,
  clickable,
  clip,
  fillMaxSize,
  fillMaxWidth,
  padding,
  paddingAll,
  Shapes,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { type Href, router } from 'expo-router';
import { useMemo } from 'react';

import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader } from '@/components/compose/screen';
import { ShoppingRecordSheet } from '@/components/compose/shopping-record-sheet';
import { useAppMaterialColors } from '@/components/compose/theme';
import { useShopping } from '@/hooks/use-shopping';
import { useShoppingRecordForm } from '@/hooks/use-shopping-record-form';
import { formatCentavos } from '@/utils/money';
import {
  formatShoppingDate,
  formatShoppingTime,
  groupByMonth,
  recordTotal,
  type ShoppingRecord,
} from '@/utils/shopping';

const TRANSPARENT = '#00000000';

function openRecord(id: string) {
  router.push(`/shopping/${id}` as Href);
}

export default function ShoppingScreen() {
  const { records, isLoading } = useShopping();
  const form = useShoppingRecordForm(openRecord);
  const colors = useAppMaterialColors();
  const sections = useMemo(() => groupByMonth(records), [records]);

  return (
    <ComposeScreen>
      <Box modifiers={[fillMaxSize()]}>
        <LazyColumn
          modifiers={[fillMaxSize()]}
          // Bottom padding keeps the last row clear of the floating button.
          contentPadding={{ start: 16, end: 16, top: 16, bottom: 96 }}
          verticalArrangement={{ spacedBy: 8 }}>
          <ScreenHeader
            title="Shopping Calculator"
            subtitle="Record your shopping and keep an eye on your budget."
            onBack={() => router.back()}
          />

          {!isLoading && sections.length === 0 ? (
            <Column
              modifiers={[fillMaxWidth(), padding(0, 48, 0, 0)]}
              horizontalAlignment="center"
              verticalArrangement={{ spacedBy: 16 }}>
              <Icon source={Icons.shoppingCart} size={40} tint={colors.onSurfaceVariant} />
              <Text
                color={colors.onSurfaceVariant}
                style={{ typography: 'bodyLarge', textAlign: 'center' }}>
                No shopping records yet. Start one to add items and track your total.
              </Text>
              <Button onClick={() => form.open()}>
                <Icon source={Icons.add} size={18} />
                <Spacer modifiers={[width(8)]} />
                <Text>New shopping</Text>
              </Button>
            </Column>
          ) : null}

          {sections.flatMap((section) => [
            <Text
              key={`heading-${section.title}`}
              color={colors.primary}
              style={{ typography: 'titleSmall' }}
              modifiers={[padding(4, 16, 0, 0)]}>
              {section.title}
            </Text>,
            ...section.data.map((record) => <ShoppingRow key={record.id} record={record} />),
          ])}
        </LazyColumn>

        {sections.length > 0 ? (
          <ExtendedFloatingActionButton
            onClick={() => form.open()}
            modifiers={[align('bottomEnd'), paddingAll(16)]}>
            <ExtendedFloatingActionButton.Icon>
              <Icon source={Icons.add} />
            </ExtendedFloatingActionButton.Icon>
            <ExtendedFloatingActionButton.Text>
              <Text>New shopping</Text>
            </ExtendedFloatingActionButton.Text>
          </ExtendedFloatingActionButton>
        ) : null}
      </Box>

      {form.isOpen ? <ShoppingRecordSheet form={form} /> : null}
    </ComposeScreen>
  );
}

/** One shopping session: location, date, time and total expenses. */
function ShoppingRow({ record }: { record: ShoppingRecord }) {
  const date = new Date(record.dateTime);

  return (
    <Card
      modifiers={[
        fillMaxWidth(),
        clip(Shapes.RoundedCorner(12)),
        clickable(() => openRecord(record.id)),
      ]}>
      <ListItem colors={{ containerColor: TRANSPARENT }}>
        <ListItem.HeadlineContent>
          <Text maxLines={1} overflow="ellipsis" style={{ typography: 'titleMedium' }}>
            {record.location}
          </Text>
        </ListItem.HeadlineContent>
        <ListItem.SupportingContent>
          <Text>{`${formatShoppingDate(date, false)} · ${formatShoppingTime(date)}`}</Text>
        </ListItem.SupportingContent>
        <ListItem.TrailingContent>
          <Text style={{ typography: 'titleMedium', fontWeight: '700' }}>
            {formatCentavos(recordTotal(record))}
          </Text>
        </ListItem.TrailingContent>
      </ListItem>
    </Card>
  );
}

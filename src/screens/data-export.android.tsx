import {
  Button,
  Card,
  Column,
  Icon,
  ListItem,
  RadioButton,
  Row,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Spacer,
  Switch,
  Text,
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

import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader, SectionLabel } from '@/components/compose/screen';
import { useAppMaterialColors, useSuccessColors } from '@/components/compose/theme';
import { useDataExport } from '@/hooks/use-data-export';
import type { ExportFormat } from '@/utils/data-export';

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV (.csv)' },
];

const TRANSPARENT = '#00000000';

const rowCount = (count: number) => `${count} ${count === 1 ? 'row' : 'rows'}`;

/** Settings → Export data: saves the app's data as an Excel workbook or a CSV file. */
export default function DataExportScreen() {
  const colors = useAppMaterialColors();
  const success = useSuccessColors();
  const data = useDataExport();
  const { tables, status } = data;
  const isEmpty = tables !== null && tables.length === 0;

  return (
    <ComposeScreen>
      <Column
        modifiers={[fillMaxSize(), verticalScroll(), paddingAll(16)]}
        verticalArrangement={{ spacedBy: 16 }}>
        <ScreenHeader
          title="Export data"
          subtitle="Save your data as a file you can open in Excel, Google Sheets or Numbers."
          onBack={() => router.back()}
        />

        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
          <SectionLabel>Format</SectionLabel>
          <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
            {FORMATS.map((option) => (
              <SegmentedButton
                key={option.value}
                selected={option.value === data.format}
                onClick={() => data.setFormat(option.value)}>
                <SegmentedButton.Label>
                  <Text>{option.label}</Text>
                </SegmentedButton.Label>
              </SegmentedButton>
            ))}
          </SingleChoiceSegmentedButtonRow>
        </Column>

        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
          <SectionLabel>{data.format === 'xlsx' ? 'Included' : 'Table to export'}</SectionLabel>
          {tables === null ? null : isEmpty ? (
            <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
              Nothing to export yet. Add records, shopping or time logs first.
            </Text>
          ) : data.format === 'xlsx' ? (
            <Card modifiers={[fillMaxWidth()]}>
              <Column modifiers={[fillMaxWidth(), paddingAll(16)]} verticalArrangement={{ spacedBy: 8 }}>
                <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
                  One workbook with a sheet for each:
                </Text>
                {tables.map((table) => (
                  <Row key={table.id} modifiers={[fillMaxWidth()]}>
                    <Text style={{ typography: 'bodyLarge' }} modifiers={[weight(1)]}>
                      {table.name}
                    </Text>
                    <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
                      {rowCount(table.rows.length)}
                    </Text>
                  </Row>
                ))}
              </Column>
            </Card>
          ) : (
            <>
              <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
                A CSV file holds one table. Choose which:
              </Text>
              {tables.map((table) => (
                <Card
                  key={table.id}
                  modifiers={[
                    fillMaxWidth(),
                    clip(Shapes.RoundedCorner(12)),
                    clickable(() => data.setCsvTableId(table.id)),
                  ]}>
                  <ListItem colors={{ containerColor: TRANSPARENT }}>
                    <ListItem.LeadingContent>
                      <RadioButton
                        selected={table.id === data.csvTableId}
                        onClick={() => data.setCsvTableId(table.id)}
                      />
                    </ListItem.LeadingContent>
                    <ListItem.HeadlineContent>
                      <Text style={{ typography: 'titleMedium' }}>{table.name}</Text>
                    </ListItem.HeadlineContent>
                    <ListItem.TrailingContent>
                      <Text>{rowCount(table.rows.length)}</Text>
                    </ListItem.TrailingContent>
                  </ListItem>
                </Card>
              ))}
            </>
          )}
        </Column>

        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
          <SectionLabel>Privacy</SectionLabel>
          <Card modifiers={[fillMaxWidth()]}>
            <ListItem colors={{ containerColor: TRANSPARENT }}>
              <ListItem.HeadlineContent>
                <Text style={{ typography: 'titleMedium' }}>Include passwords and card numbers</Text>
              </ListItem.HeadlineContent>
              <ListItem.SupportingContent>
                <Text color={data.includeSensitive ? colors.error : undefined}>
                  {data.includeSensitive
                    ? 'They will be readable by anyone who opens the file.'
                    : 'Off: they appear masked, like •••• 7890.'}
                </Text>
              </ListItem.SupportingContent>
              <ListItem.TrailingContent>
                <Switch value={data.includeSensitive} onCheckedChange={data.setIncludeSensitive} />
              </ListItem.TrailingContent>
            </ListItem>
          </Card>
        </Column>

        <Button
          onClick={data.runExport}
          enabled={status.kind !== 'working' && tables !== null && !isEmpty}
          modifiers={[fillMaxWidth()]}>
          <Row verticalAlignment="center">
            <Icon source={Icons.download} size={18} />
            <Spacer modifiers={[width(8)]} />
            <Text>{status.kind === 'working' ? 'Exporting…' : 'Export'}</Text>
          </Row>
        </Button>
        <Text
          color={colors.onSurfaceVariant}
          style={{ typography: 'bodySmall', textAlign: 'center' }}
          modifiers={[fillMaxWidth()]}>
          {"You'll choose the folder to save it in, like Downloads."}
        </Text>

        {status.kind === 'done' || status.kind === 'error' ? (
          <Text
            color={status.kind === 'done' ? success.accent : colors.error}
            style={{ typography: 'bodyMedium' }}
            modifiers={[padding(4, 0, 4, 0)]}>
            {status.message}
          </Text>
        ) : null}
      </Column>
    </ComposeScreen>
  );
}

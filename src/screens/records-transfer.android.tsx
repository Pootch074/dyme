import {
  Button,
  Card,
  Column,
  Icon,
  ListItem,
  OutlinedButton,
  Row,
  Spacer,
  Switch,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  fillMaxWidth,
  paddingAll,
  verticalScroll,
  weight,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';

import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader, SectionLabel } from '@/components/compose/screen';
import { useAppMaterialColors, useSuccessColors } from '@/components/compose/theme';
import { rowStatus, useRecordsTransfer } from '@/hooks/use-records-transfer';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ImportPreview, ImportRow } from '@/utils/records-csv';

const TRANSPARENT = '#00000000';

/** Rows listed in the preview; the rest are summarized, so a huge file stays quick. */
const MAX_PREVIEW_ROWS = 100;

type Transfer = ReturnType<typeof useRecordsTransfer>;

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** What names a row's entry, for "(no …)" when it's blank. */
function titleLabel(row: ImportRow): string {
  const category = row.category;
  return category?.fields.find((field) => field.key === category.titleField)?.label ?? 'name';
}

/**
 * Records → Import & export: every category in one CSV file, both ways. Import
 * goes through a checked preview; Export saves all records, or the template.
 */
export default function RecordsTransferScreen() {
  const transfer = useRecordsTransfer();
  const colors = useAppMaterialColors();
  const success = useSuccessColors();
  const { importState, fileStatus } = transfer;

  return (
    <ComposeScreen>
      <Column
        modifiers={[fillMaxSize(), verticalScroll(), paddingAll(16)]}
        verticalArrangement={{ spacedBy: 16 }}>
        <ScreenHeader
          title="Import & export"
          subtitle="Move all your records, every category, in and out as one CSV file. Files exported here import back as they are."
          onBack={() => router.back()}
        />

        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
          <SectionLabel>Import</SectionLabel>
          {importState.kind === 'preview' ? (
            <ImportPreviewPanel transfer={transfer} preview={importState.preview} />
          ) : (
            <Card modifiers={[fillMaxWidth()]}>
              <Column
                modifiers={[fillMaxWidth(), paddingAll(16)]}
                verticalArrangement={{ spacedBy: 12 }}>
                <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
                  {
                    "Add records of any category from a CSV file: one exported from Dyme, or a filled-in template from below. You'll see a preview before anything is added."
                  }
                </Text>
                {importState.kind === 'error' || importState.kind === 'done' ? (
                  <Text
                    color={importState.kind === 'done' ? success.accent : colors.error}
                    style={{ typography: 'bodyMedium' }}>
                    {importState.message}
                  </Text>
                ) : null}
                <Button
                  onClick={transfer.chooseFile}
                  enabled={importState.kind !== 'reading' && !transfer.isLoading}
                  modifiers={[fillMaxWidth()]}>
                  <Icon source={Icons.upload} size={18} />
                  <Spacer modifiers={[width(8)]} />
                  <Text>{importState.kind === 'reading' ? 'Reading…' : 'Choose CSV file'}</Text>
                </Button>
                {importState.kind === 'done' && importState.category ? (
                  <OutlinedButton
                    onClick={() =>
                      router.push({
                        pathname: '/records/[category]',
                        params: { category: importState.category!.id },
                      })
                    }
                    modifiers={[fillMaxWidth()]}>
                    <Text>{`Open ${importState.category!.label}`}</Text>
                  </OutlinedButton>
                ) : null}
              </Column>
            </Card>
          )}
        </Column>

        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
          <SectionLabel>Export</SectionLabel>
          <Card modifiers={[fillMaxWidth()]}>
            <ListItem colors={{ containerColor: TRANSPARENT }}>
              <ListItem.HeadlineContent>
                <Text style={{ typography: 'titleMedium' }}>Include passwords and card numbers</Text>
              </ListItem.HeadlineContent>
              <ListItem.SupportingContent>
                <Text color={transfer.includeSensitive ? colors.error : undefined}>
                  {transfer.includeSensitive
                    ? 'They will be readable by anyone who opens the file.'
                    : "Off: they're masked, and left blank if the file is imported back."}
                </Text>
              </ListItem.SupportingContent>
              <ListItem.TrailingContent>
                <Switch
                  value={transfer.includeSensitive}
                  onCheckedChange={transfer.setIncludeSensitive}
                />
              </ListItem.TrailingContent>
            </ListItem>
          </Card>

          <Card modifiers={[fillMaxWidth()]}>
            <Column
              modifiers={[fillMaxWidth(), paddingAll(16)]}
              verticalArrangement={{ spacedBy: 8 }}>
              <Text style={{ typography: 'titleMedium' }}>All records</Text>
              <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
                {transfer.isLoading
                  ? ' '
                  : transfer.entryCount === 0
                    ? 'No records yet.'
                    : `${plural(transfer.entryCount, 'record', 'records')} in ${plural(transfer.categoryCount, 'category', 'categories')}. The file has every category, with a Category column saying where each record goes.`}
              </Text>
              <Row modifiers={[fillMaxWidth()]} horizontalArrangement={{ spacedBy: 8 }}>
                <OutlinedButton
                  onClick={transfer.downloadTemplate}
                  enabled={fileStatus.kind !== 'working'}
                  modifiers={[weight(1)]}>
                  <Text>Template</Text>
                </OutlinedButton>
                <Button
                  onClick={transfer.exportAll}
                  enabled={fileStatus.kind !== 'working' && transfer.entryCount > 0}
                  modifiers={[weight(1)]}>
                  <Icon source={Icons.download} size={18} />
                  <Spacer modifiers={[width(8)]} />
                  <Text>Export all</Text>
                </Button>
              </Row>
            </Column>
          </Card>

          {fileStatus.kind === 'done' || fileStatus.kind === 'error' ? (
            <Text
              color={fileStatus.kind === 'done' ? success.accent : colors.error}
              style={{ typography: 'bodyMedium' }}>
              {fileStatus.message}
            </Text>
          ) : null}
          <Text
            color={colors.onSurfaceVariant}
            style={{ typography: 'bodySmall', textAlign: 'center' }}
            modifiers={[fillMaxWidth()]}>
            The template has every column and one example row per category to replace or delete.
          </Text>
        </Column>
      </Column>
    </ComposeScreen>
  );
}

function ImportPreviewPanel({ transfer, preview }: { transfer: Transfer; preview: ImportPreview }) {
  const colors = useAppMaterialColors();
  const success = useSuccessColors();
  const colorScheme = useColorScheme();
  const { options, summary } = transfer;
  if (!summary) return null;

  const toneColor = {
    ok: success.accent,
    warning: colorScheme === 'dark' ? '#FFB86B' : '#9A5B00',
    error: colors.error,
    muted: colors.onSurfaceVariant,
  };
  const counts = [
    `${summary.ready} ready`,
    ...(summary.invalid > 0 ? [`${summary.invalid} with errors`] : []),
    ...(summary.duplicates > 0
      ? [`${summary.duplicates} ${summary.duplicates === 1 ? 'duplicate' : 'duplicates'}`]
      : []),
  ];

  return (
    <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
      <Card modifiers={[fillMaxWidth()]}>
        <Column modifiers={[fillMaxWidth(), paddingAll(16)]} verticalArrangement={{ spacedBy: 4 }}>
          <Text style={{ typography: 'titleMedium' }} maxLines={1} overflow="ellipsis">
            {preview.fileName}
          </Text>
          <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
            {`${plural(preview.rows.length, 'row', 'rows')} · ${plural(preview.categories.length, 'category', 'categories')}`}
          </Text>
          {preview.categories.length > 0 ? (
            <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
              {preview.categories
                .map(({ category, rows }) => `${category.emoji} ${category.label} ${rows}`)
                .join(' · ')}
            </Text>
          ) : null}
          <Text style={{ typography: 'bodyMedium' }}>{counts.join(' · ')}</Text>
          {preview.missingColumns.length > 0 ? (
            <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
              {`Not in the file, left blank: ${preview.missingColumns.join(', ')}`}
            </Text>
          ) : null}
          {preview.ignoredColumns.length > 0 ? (
            <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
              {`Ignored columns: ${preview.ignoredColumns.join(', ')}`}
            </Text>
          ) : null}
        </Column>
      </Card>

      {summary.fixable > 0 ? (
        <Card modifiers={[fillMaxWidth()]}>
          <ListItem colors={{ containerColor: TRANSPARENT }}>
            <ListItem.HeadlineContent>
              <Text style={{ typography: 'titleMedium' }}>Import rows with errors anyway</Text>
            </ListItem.HeadlineContent>
            <ListItem.SupportingContent>
              <Text>
                {`${plural(summary.fixable, 'row', 'rows')}: the invalid values are left blank. Rows without a name or a known category are always skipped.`}
              </Text>
            </ListItem.SupportingContent>
            <ListItem.TrailingContent>
              <Switch
                value={options.fixInvalid}
                onCheckedChange={(fixInvalid) => transfer.setOptions({ fixInvalid })}
              />
            </ListItem.TrailingContent>
          </ListItem>
        </Card>
      ) : null}
      {summary.duplicates > 0 ? (
        <Card modifiers={[fillMaxWidth()]}>
          <ListItem colors={{ containerColor: TRANSPARENT }}>
            <ListItem.HeadlineContent>
              <Text style={{ typography: 'titleMedium' }}>Import duplicates too</Text>
            </ListItem.HeadlineContent>
            <ListItem.SupportingContent>
              <Text>Off: rows matching a saved entry, or an earlier row, are skipped.</Text>
            </ListItem.SupportingContent>
            <ListItem.TrailingContent>
              <Switch
                value={options.includeDuplicates}
                onCheckedChange={(includeDuplicates) => transfer.setOptions({ includeDuplicates })}
              />
            </ListItem.TrailingContent>
          </ListItem>
        </Card>
      ) : null}

      {preview.rows.slice(0, MAX_PREVIEW_ROWS).map((row) => {
        const status = rowStatus(row, options);
        return (
          <Card key={row.line} modifiers={[fillMaxWidth()]}>
            <Column
              modifiers={[fillMaxWidth(), paddingAll(12)]}
              verticalArrangement={{ spacedBy: 2 }}>
              <Row modifiers={[fillMaxWidth()]} verticalAlignment="center">
                <Text
                  style={{ typography: 'titleSmall' }}
                  maxLines={1}
                  overflow="ellipsis"
                  modifiers={[weight(1)]}>
                  {row.title || `(no ${titleLabel(row).toLowerCase()})`}
                </Text>
                <Text color={toneColor[status.tone]} style={{ typography: 'labelLarge' }}>
                  {status.label}
                </Text>
              </Row>
              <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
                {`Row ${row.line}${row.category ? ` · ${row.category.emoji} ${row.category.label}` : ''}`}
              </Text>
              {row.errors.map((message) => (
                <Text key={message} color={colors.error} style={{ typography: 'bodySmall' }}>
                  {`• ${message}`}
                </Text>
              ))}
            </Column>
          </Card>
        );
      })}
      {preview.rows.length > MAX_PREVIEW_ROWS ? (
        <Text
          color={colors.onSurfaceVariant}
          style={{ typography: 'bodySmall', textAlign: 'center' }}
          modifiers={[fillMaxWidth()]}>
          {`…and ${preview.rows.length - MAX_PREVIEW_ROWS} more rows.`}
        </Text>
      ) : null}

      <Row modifiers={[fillMaxWidth()]} horizontalArrangement={{ spacedBy: 8 }}>
        <OutlinedButton onClick={transfer.resetImport} modifiers={[weight(1)]}>
          <Text>Cancel</Text>
        </OutlinedButton>
        <Button
          onClick={transfer.confirmImport}
          enabled={summary.toImport > 0}
          modifiers={[weight(1)]}>
          <Text>
            {summary.toImport === 0
              ? 'Nothing to import'
              : `Import ${summary.toImport === 1 ? '1 record' : `${summary.toImport} records`}`}
          </Text>
        </Button>
      </Row>
    </Column>
  );
}

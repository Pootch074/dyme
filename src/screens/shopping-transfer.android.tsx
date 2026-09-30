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
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  plural,
  sessionDetails,
  sessionStatus,
  useShoppingTransfer,
} from '@/hooks/use-shopping-transfer';
import type { ImportPreview } from '@/utils/shopping-csv';

const TRANSPARENT = '#00000000';

/** Sessions listed in the preview; the rest are summarized, so a huge file stays quick. */
const MAX_PREVIEW_SESSIONS = 100;

type Transfer = ReturnType<typeof useShoppingTransfer>;

/**
 * Shopping Calculator → Import & export: every shopping session and its items
 * in one CSV file, both ways. Import goes through a checked preview and only
 * adds sessions; Export saves them all, or the template.
 */
export default function ShoppingTransferScreen() {
  const transfer = useShoppingTransfer();
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
          subtitle="Back up, move or restore all your shopping, every store and its items, as one CSV file. Files exported here import back as they are."
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
                    "Add shopping from a CSV file: one exported from Dyme, or a filled-in template from below. Your saved shopping stays as it is, and you'll see a preview before anything is added."
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
              </Column>
            </Card>
          )}
        </Column>

        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
          <SectionLabel>Export</SectionLabel>
          <Card modifiers={[fillMaxWidth()]}>
            <Column
              modifiers={[fillMaxWidth(), paddingAll(16)]}
              verticalArrangement={{ spacedBy: 8 }}>
              <Text style={{ typography: 'titleMedium' }}>All shopping</Text>
              <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
                {transfer.isLoading
                  ? ' '
                  : transfer.sessionCount === 0
                    ? 'No shopping yet.'
                    : `${plural(transfer.sessionCount, 'shopping session', 'shopping sessions')} with ${plural(transfer.itemCount, 'item', 'items')}. Each item is a row with its store's location, date and time, and budget.`}
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
                  enabled={fileStatus.kind !== 'working' && transfer.sessionCount > 0}
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
            Rows with the same Session number are one shopping trip. The template has two example
            sessions to replace.
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
  const itemRows = preview.sessions.reduce(
    (sum, session) => sum + session.items.length + session.skippedItems,
    0
  );
  const counts = [
    `${summary.ready} ready`,
    ...(summary.invalid > 0 ? [`${summary.invalid} with errors`] : []),
    ...(summary.duplicates > 0 ? [plural(summary.duplicates, 'duplicate', 'duplicates')] : []),
  ];

  return (
    <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
      <Card modifiers={[fillMaxWidth()]}>
        <Column modifiers={[fillMaxWidth(), paddingAll(16)]} verticalArrangement={{ spacedBy: 4 }}>
          <Text style={{ typography: 'titleMedium' }} maxLines={1} overflow="ellipsis">
            {preview.fileName}
          </Text>
          <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
            {`${plural(preview.sessions.length, 'shopping session', 'shopping sessions')} · ${plural(itemRows, 'item', 'items')}`}
          </Text>
          <Text style={{ typography: 'bodyMedium' }}>{counts.join(' · ')}</Text>
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
              <Text style={{ typography: 'titleMedium' }}>Import sessions with errors anyway</Text>
            </ListItem.HeadlineContent>
            <ListItem.SupportingContent>
              <Text>
                {`${plural(summary.fixable, 'session', 'sessions')}: invalid items are left out, and an invalid budget or Added date is left blank. Sessions without a location or date are always skipped.`}
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
              <Text>
                Off: sessions matching a saved one (same store, date and time, and items), or an
                earlier one in the file, are skipped.
              </Text>
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

      {preview.sessions.slice(0, MAX_PREVIEW_SESSIONS).map((session) => {
        const status = sessionStatus(session, options);
        return (
          <Card key={session.line} modifiers={[fillMaxWidth()]}>
            <Column
              modifiers={[fillMaxWidth(), paddingAll(12)]}
              verticalArrangement={{ spacedBy: 2 }}>
              <Row modifiers={[fillMaxWidth()]} verticalAlignment="center">
                <Text
                  style={{ typography: 'titleSmall' }}
                  maxLines={1}
                  overflow="ellipsis"
                  modifiers={[weight(1)]}>
                  {session.location || '(no location)'}
                </Text>
                <Text color={toneColor[status.tone]} style={{ typography: 'labelLarge' }}>
                  {status.label}
                </Text>
              </Row>
              <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
                {sessionDetails(session)}
              </Text>
              {session.errors.map((message) => (
                <Text key={message} color={colors.error} style={{ typography: 'bodySmall' }}>
                  {`• ${message}`}
                </Text>
              ))}
            </Column>
          </Card>
        );
      })}
      {preview.sessions.length > MAX_PREVIEW_SESSIONS ? (
        <Text
          color={colors.onSurfaceVariant}
          style={{ typography: 'bodySmall', textAlign: 'center' }}
          modifiers={[fillMaxWidth()]}>
          {`…and ${preview.sessions.length - MAX_PREVIEW_SESSIONS} more sessions.`}
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
              : `Import ${plural(summary.toImport, 'session', 'sessions')}`}
          </Text>
        </Button>
      </Row>
    </Column>
  );
}

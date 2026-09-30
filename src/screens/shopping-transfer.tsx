import { Feather } from '@react-native-vector-icons/feather';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  plural,
  sessionDetails,
  sessionStatus,
  useShoppingTransfer,
} from '@/hooks/use-shopping-transfer';
import { useTheme } from '@/hooks/use-theme';
import type { ImportPreview } from '@/utils/shopping-csv';

const ACCENT = '#3c87f7';
const WARNING = '#C77700';

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
  const { importState, fileStatus } = transfer;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackButton />
          <ThemedText type="subtitle">Import & export</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Back up, move or restore all your shopping, every store and its items, as one CSV
            file. Files exported here import back as they are.
          </ThemedText>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            Import
          </ThemedText>
          {importState.kind === 'preview' ? (
            <ImportPreviewPanel transfer={transfer} preview={importState.preview} />
          ) : (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                {
                  "Add shopping from a CSV file: one exported from Dyme, or a filled-in template from below. Your saved shopping stays as it is, and you'll see a preview before anything is added."
                }
              </ThemedText>
              {importState.kind === 'error' ? (
                <Message tone="error" text={importState.message} />
              ) : importState.kind === 'done' ? (
                <Message tone="ok" text={importState.message} />
              ) : null}
              <View style={styles.actions}>
                <Button
                  label={importState.kind === 'reading' ? 'Reading…' : 'Choose CSV file'}
                  icon="upload"
                  onPress={transfer.chooseFile}
                  disabled={importState.kind === 'reading' || transfer.isLoading}
                  style={styles.flex}
                />
              </View>
            </ThemedView>
          )}

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            Export
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText style={styles.bold}>All shopping</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {transfer.isLoading
                ? ' '
                : transfer.sessionCount === 0
                  ? 'No shopping yet.'
                  : `${plural(transfer.sessionCount, 'shopping session', 'shopping sessions')} with ${plural(transfer.itemCount, 'item', 'items')}. Each item is a row with its store's location, date and time, and budget.`}
            </ThemedText>
            <View style={styles.actions}>
              <Button
                label="Template"
                icon="file-text"
                variant="secondary"
                onPress={transfer.downloadTemplate}
                disabled={fileStatus.kind === 'working'}
                style={styles.flex}
              />
              <Button
                label="Export all"
                icon="download"
                onPress={transfer.exportAll}
                disabled={fileStatus.kind === 'working' || transfer.sessionCount === 0}
                style={styles.flex}
              />
            </View>
          </ThemedView>

          {fileStatus.kind === 'done' || fileStatus.kind === 'error' ? (
            <View style={styles.fileStatus}>
              <Message tone={fileStatus.kind === 'done' ? 'ok' : 'error'} text={fileStatus.message} />
            </View>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            Rows with the same Session number are one shopping trip. The template has two example
            sessions to replace.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ImportPreviewPanel({ transfer, preview }: { transfer: Transfer; preview: ImportPreview }) {
  const theme = useTheme();
  const { options, summary } = transfer;
  if (!summary) return null;
  const toneColor = {
    ok: theme.success,
    warning: WARNING,
    error: theme.danger,
    muted: theme.textSecondary,
  };
  const itemRows = preview.sessions.reduce(
    (sum, session) => sum + session.items.length + session.skippedItems,
    0
  );

  return (
    <View style={styles.list}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText style={styles.bold} numberOfLines={1}>
          {preview.fileName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {plural(preview.sessions.length, 'shopping session', 'shopping sessions')} ·{' '}
          {plural(itemRows, 'item', 'items')}
        </ThemedText>
        <View style={styles.counts}>
          <Count icon="check-circle" color={theme.success} text={`${summary.ready} ready`} />
          {summary.invalid > 0 ? (
            <Count icon="alert-circle" color={theme.danger} text={`${summary.invalid} with errors`} />
          ) : null}
          {summary.duplicates > 0 ? (
            <Count
              icon="copy"
              color={theme.textSecondary}
              text={plural(summary.duplicates, 'duplicate', 'duplicates')}
            />
          ) : null}
        </View>
        {preview.ignoredColumns.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Ignored columns: {preview.ignoredColumns.join(', ')}
          </ThemedText>
        ) : null}
      </ThemedView>

      {summary.fixable > 0 ? (
        <ThemedView type="backgroundElement" style={styles.switchRow}>
          <View style={styles.flex}>
            <ThemedText style={styles.bold}>Import sessions with errors anyway</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {`${plural(summary.fixable, 'session', 'sessions')}: invalid items are left out, and an invalid budget or Added date is left blank. Sessions without a location or date are always skipped.`}
            </ThemedText>
          </View>
          <Switch
            value={options.fixInvalid}
            onValueChange={(fixInvalid) => transfer.setOptions({ fixInvalid })}
            trackColor={{ true: ACCENT }}
            accessibilityLabel="Import sessions with errors, leaving invalid values out"
          />
        </ThemedView>
      ) : null}
      {summary.duplicates > 0 ? (
        <ThemedView type="backgroundElement" style={styles.switchRow}>
          <View style={styles.flex}>
            <ThemedText style={styles.bold}>Import duplicates too</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Off: sessions matching a saved one (same store, date and time, and items), or an
              earlier one in the file, are skipped.
            </ThemedText>
          </View>
          <Switch
            value={options.includeDuplicates}
            onValueChange={(includeDuplicates) => transfer.setOptions({ includeDuplicates })}
            trackColor={{ true: ACCENT }}
            accessibilityLabel="Import duplicates too"
          />
        </ThemedView>
      ) : null}

      {preview.sessions.slice(0, MAX_PREVIEW_SESSIONS).map((session) => {
        const status = sessionStatus(session, options);
        return (
          <ThemedView key={session.line} type="backgroundElement" style={styles.previewRow}>
            <View style={styles.previewRowHeader}>
              <ThemedText numberOfLines={1} style={[styles.flex, styles.bold]}>
                {session.location || '(no location)'}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: toneColor[status.tone] }}>
                {status.label}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {sessionDetails(session)}
            </ThemedText>
            {session.errors.map((message) => (
              <ThemedText key={message} type="small" themeColor="danger">
                • {message}
              </ThemedText>
            ))}
          </ThemedView>
        );
      })}
      {preview.sessions.length > MAX_PREVIEW_SESSIONS ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          …and {preview.sessions.length - MAX_PREVIEW_SESSIONS} more sessions.
        </ThemedText>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={transfer.resetImport}
          style={styles.flex}
        />
        <Button
          label={
            summary.toImport === 0
              ? 'Nothing to import'
              : `Import ${plural(summary.toImport, 'session', 'sessions')}`
          }
          icon="check"
          onPress={transfer.confirmImport}
          disabled={summary.toImport === 0}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

type CountProps = {
  icon: 'check-circle' | 'alert-circle' | 'copy';
  color: string;
  text: string;
};

function Count({ icon, color, text }: CountProps) {
  return (
    <View style={styles.count}>
      <Feather name={icon} size={14} color={color} />
      <ThemedText type="small" style={{ color }}>
        {text}
      </ThemedText>
    </View>
  );
}

function Message({ tone, text }: { tone: 'ok' | 'error'; text: string }) {
  const theme = useTheme();
  const color = tone === 'ok' ? theme.success : theme.danger;
  return (
    <View style={styles.message} accessibilityLiveRegion="polite">
      <Feather name={tone === 'ok' ? 'check-circle' : 'alert-circle'} size={16} color={color} />
      <ThemedText type="small" style={[styles.flex, { color }]}>
        {text}
      </ThemedText>
    </View>
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
  content: {
    padding: Spacing.four,
  },
  subtitle: {
    marginTop: Spacing.half,
  },
  sectionHeader: {
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontWeight: '600',
  },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  list: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  counts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  previewRow: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.half,
  },
  previewRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  fileStatus: {
    marginTop: Spacing.three,
  },
  hint: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },
});

import { Feather } from '@react-native-vector-icons/feather';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { rowStatus, useRecordsTransfer } from '@/hooks/use-records-transfer';
import { useTheme } from '@/hooks/use-theme';
import type { ImportPreview, ImportRow } from '@/utils/records-csv';

const ACCENT = '#3c87f7';
const WARNING = '#C77700';

/** Rows listed in the preview; the rest are summarized, so a huge file stays quick. */
const MAX_PREVIEW_ROWS = 100;

type Transfer = ReturnType<typeof useRecordsTransfer>;

/**
 * Records → Import & export: every category in one CSV file, both ways. Import
 * goes through a checked preview; Export saves all records, or the template.
 */
export default function RecordsTransferScreen() {
  const transfer = useRecordsTransfer();
  const { importState, fileStatus } = transfer;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackButton />
          <ThemedText type="subtitle">Import & export</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Move all your records, every category, in and out as one CSV file. Files exported
            here import back as they are.
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
                  "Add records of any category from a CSV file: one exported from Dyme, or a filled-in template from below. You'll see a preview before anything is added."
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
                {importState.kind === 'done' && importState.category ? (
                  <Button
                    label={`Open ${importState.category.label}`}
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: '/records/[category]',
                        params: { category: importState.category!.id },
                      })
                    }
                    style={styles.flex}
                  />
                ) : null}
              </View>
            </ThemedView>
          )}

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            Export
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.switchRow}>
            <View style={styles.flex}>
              <ThemedText style={styles.bold}>Include passwords and card numbers</ThemedText>
              <ThemedText
                type="small"
                themeColor={transfer.includeSensitive ? 'danger' : 'textSecondary'}>
                {transfer.includeSensitive
                  ? 'They will be readable by anyone who opens the file.'
                  : "Off: they're masked, and left blank if the file is imported back."}
              </ThemedText>
            </View>
            <Switch
              value={transfer.includeSensitive}
              onValueChange={transfer.setIncludeSensitive}
              trackColor={{ true: ACCENT }}
              accessibilityLabel="Include passwords and card numbers"
            />
          </ThemedView>

          <ThemedView type="backgroundElement" style={[styles.card, styles.exportCard]}>
            <ThemedText style={styles.bold}>All records</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {transfer.isLoading
                ? ' '
                : transfer.entryCount === 0
                  ? 'No records yet.'
                  : `${plural(transfer.entryCount, 'record', 'records')} in ${plural(transfer.categoryCount, 'category', 'categories')}. The file has every category, with a Category column saying where each record goes.`}
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
                disabled={fileStatus.kind === 'working' || transfer.entryCount === 0}
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
            The template has every column and one example row per category to replace or delete.
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

  return (
    <View style={styles.list}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText style={styles.bold} numberOfLines={1}>
          {preview.fileName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {plural(preview.rows.length, 'row', 'rows')} ·{' '}
          {plural(preview.categories.length, 'category', 'categories')}
        </ThemedText>
        {preview.categories.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {preview.categories
              .map(({ category, rows }) => `${category.emoji} ${category.label} ${rows}`)
              .join(' · ')}
          </ThemedText>
        ) : null}
        <View style={styles.counts}>
          <Count icon="check-circle" color={theme.success} text={`${summary.ready} ready`} />
          {summary.invalid > 0 ? (
            <Count icon="alert-circle" color={theme.danger} text={`${summary.invalid} with errors`} />
          ) : null}
          {summary.duplicates > 0 ? (
            <Count
              icon="copy"
              color={theme.textSecondary}
              text={`${summary.duplicates} ${summary.duplicates === 1 ? 'duplicate' : 'duplicates'}`}
            />
          ) : null}
        </View>
        {preview.missingColumns.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Not in the file, left blank: {preview.missingColumns.join(', ')}
          </ThemedText>
        ) : null}
        {preview.ignoredColumns.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Ignored columns: {preview.ignoredColumns.join(', ')}
          </ThemedText>
        ) : null}
      </ThemedView>

      {summary.fixable > 0 ? (
        <ThemedView type="backgroundElement" style={styles.switchRow}>
          <View style={styles.flex}>
            <ThemedText style={styles.bold}>Import rows with errors anyway</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {`${plural(summary.fixable, 'row', 'rows')}: the invalid values are left blank. Rows without a name or a known category are always skipped.`}
            </ThemedText>
          </View>
          <Switch
            value={options.fixInvalid}
            onValueChange={(fixInvalid) => transfer.setOptions({ fixInvalid })}
            trackColor={{ true: ACCENT }}
            accessibilityLabel="Import rows with errors, leaving invalid values blank"
          />
        </ThemedView>
      ) : null}
      {summary.duplicates > 0 ? (
        <ThemedView type="backgroundElement" style={styles.switchRow}>
          <View style={styles.flex}>
            <ThemedText style={styles.bold}>Import duplicates too</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Off: rows matching a saved entry, or an earlier row, are skipped.
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

      {preview.rows.slice(0, MAX_PREVIEW_ROWS).map((row) => {
        const status = rowStatus(row, options);
        return (
          <ThemedView key={row.line} type="backgroundElement" style={styles.previewRow}>
            <View style={styles.previewRowHeader}>
              <ThemedText numberOfLines={1} style={[styles.flex, styles.bold]}>
                {row.title || `(no ${titleLabel(row).toLowerCase()})`}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: toneColor[status.tone] }}>
                {status.label}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Row {row.line}
              {row.category ? ` · ${row.category.emoji} ${row.category.label}` : ''}
            </ThemedText>
            {row.errors.map((message) => (
              <ThemedText key={message} type="small" themeColor="danger">
                • {message}
              </ThemedText>
            ))}
          </ThemedView>
        );
      })}
      {preview.rows.length > MAX_PREVIEW_ROWS ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          …and {preview.rows.length - MAX_PREVIEW_ROWS} more rows.
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
              : `Import ${summary.toImport === 1 ? '1 record' : `${summary.toImport} records`}`
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

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** What names a row's entry, for "(no …)" when it's blank. */
function titleLabel(row: ImportRow): string {
  const category = row.category;
  return category?.fields.find((field) => field.key === category.titleField)?.label ?? 'name';
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
  exportCard: {
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

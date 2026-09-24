import { Feather } from '@react-native-vector-icons/feather';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useDataExport } from '@/hooks/use-data-export';
import { useTheme } from '@/hooks/use-theme';
import type { ExportFormat } from '@/utils/data-export';

const ACCENT = '#3c87f7';

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV (.csv)' },
];

const SAVE_HINT = Platform.select({
  web: 'The file downloads through your browser.',
  android: "You'll choose the folder to save it in, like Downloads.",
  default: 'Choose "Save to Files" to keep it on your device, or send it elsewhere.',
});

const rowCount = (count: number) => `${count} ${count === 1 ? 'row' : 'rows'}`;

/** Settings → Export data: saves the app's data as an Excel workbook or a CSV file. */
export default function DataExportScreen() {
  const theme = useTheme();
  const data = useDataExport();
  const { tables, status } = data;
  const isEmpty = tables !== null && tables.length === 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <BackButton />
          <ThemedText type="subtitle">Export data</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Save your data as a file you can open in Excel, Google Sheets or Numbers.
          </ThemedText>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            Format
          </ThemedText>
          <View style={styles.segmented} accessibilityRole="radiogroup">
            {FORMATS.map((option) => {
              const isSelected = option.value === data.format;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => data.setFormat(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  style={({ pressed }) => [
                    styles.segment,
                    isSelected && styles.segmentSelected,
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="smallBold"
                    themeColor="textSecondary"
                    style={isSelected && styles.segmentSelectedText}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            {data.format === 'xlsx' ? 'Included' : 'Table to export'}
          </ThemedText>
          {tables === null ? null : isEmpty ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nothing to export yet. Add records, shopping or time logs first.
            </ThemedText>
          ) : data.format === 'xlsx' ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                One workbook with a sheet for each:
              </ThemedText>
              {tables.map((table) => (
                <View key={table.id} style={styles.tableRow}>
                  <Feather name="grid" size={16} color={theme.textSecondary} />
                  <ThemedText type="small" style={styles.tableName}>
                    {table.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {rowCount(table.rows.length)}
                  </ThemedText>
                </View>
              ))}
            </ThemedView>
          ) : (
            <View style={styles.choices} accessibilityRole="radiogroup">
              <ThemedText type="small" themeColor="textSecondary">
                A CSV file holds one table. Choose which:
              </ThemedText>
              {tables.map((table) => {
                const isSelected = table.id === data.csvTableId;
                return (
                  <Pressable
                    key={table.id}
                    onPress={() => data.setCsvTableId(table.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedView
                      type="backgroundElement"
                      style={[styles.choice, isSelected && styles.choiceSelected]}>
                      <Feather
                        name={isSelected ? 'check-circle' : 'circle'}
                        size={18}
                        color={isSelected ? ACCENT : theme.textSecondary}
                      />
                      <ThemedText style={styles.tableName}>{table.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {rowCount(table.rows.length)}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                );
              })}
            </View>
          )}

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            Privacy
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.switchRow}>
            <View style={styles.switchText}>
              <ThemedText style={styles.switchLabel}>Include passwords and card numbers</ThemedText>
              <ThemedText
                type="small"
                themeColor={data.includeSensitive ? 'danger' : 'textSecondary'}>
                {data.includeSensitive
                  ? 'They will be readable by anyone who opens the file.'
                  : 'Off: they appear masked, like •••• 7890.'}
              </ThemedText>
            </View>
            <Switch
              value={data.includeSensitive}
              onValueChange={data.setIncludeSensitive}
              trackColor={{ true: ACCENT }}
              accessibilityLabel="Include passwords and card numbers"
            />
          </ThemedView>

          <Button
            label={status.kind === 'working' ? 'Exporting…' : 'Export'}
            icon="download"
            onPress={data.runExport}
            disabled={status.kind === 'working' || tables === null || isEmpty}
            style={styles.exportButton}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {SAVE_HINT}
          </ThemedText>

          {status.kind === 'done' || status.kind === 'error' ? (
            <View style={styles.status} accessibilityLiveRegion="polite">
              <Feather
                name={status.kind === 'done' ? 'check-circle' : 'alert-circle'}
                size={16}
                color={status.kind === 'done' ? theme.success : theme.danger}
              />
              <ThemedText
                type="small"
                themeColor={status.kind === 'done' ? 'success' : 'danger'}
                style={styles.tableName}>
                {status.message}
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
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
    marginBottom: Spacing.two,
  },
  sectionHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  segmented: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
  },
  segmentSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  segmentSelectedText: {
    color: '#ffffff',
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  tableName: {
    flex: 1,
  },
  choices: {
    gap: Spacing.two,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: Spacing.three,
  },
  choiceSelected: {
    borderColor: ACCENT,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  switchText: {
    flex: 1,
    gap: Spacing.half,
  },
  switchLabel: {
    fontWeight: '600',
  },
  exportButton: {
    marginTop: Spacing.four,
    paddingVertical: Spacing.two + Spacing.one,
  },
  hint: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});

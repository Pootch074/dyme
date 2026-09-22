import { Feather } from '@react-native-vector-icons/feather';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { DateField } from '@/components/date-field';
import { DtrRow } from '@/components/dtr-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeField } from '@/components/time-field';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { type DtrEntry, useDtr } from '@/hooks/use-dtr';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate, parseDateOnly, toDateOnlyString } from '@/utils/date';
import { getPeriodForDate, listPeriodsWithEntries, periodLabel, type DtrPeriod } from '@/utils/dtr-period';
import { exportDtrDocument } from '@/utils/dtr-print';
import { buildDtrHtml } from '@/utils/dtr-template';

type DtrSection = {
  title: string;
  data: DtrEntry[];
};

/** Groups time logs into same calendar-month sections, newest date first. */
function groupByPeriod(entries: DtrEntry[]): DtrSection[] {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const sections: DtrSection[] = [];
  let lastLabel = '';

  for (const entry of sorted) {
    const label = periodLabel(getPeriodForDate(parseDateOnly(entry.date)));
    if (label === lastLabel) {
      sections[sections.length - 1].data.push(entry);
    } else {
      sections.push({ title: label, data: [entry] });
      lastLabel = label;
    }
  }

  return sections;
}

export default function DtrScreen() {
  const { entries, isLoading, saveEntry, removeEntry } = useDtr();
  const theme = useTheme();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(() => new Date());
  const [amIn, setAmIn] = useState<string | null>(null);
  const [lunchOut, setLunchOut] = useState<string | null>(null);
  const [lunchIn, setLunchIn] = useState<string | null>(null);
  const [pmOut, setPmOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pendingDeleteDate, setPendingDeleteDate] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const today = new Date();
  const sections = useMemo(() => groupByPeriod(entries), [entries]);
  const periods = useMemo(() => listPeriodsWithEntries(entries), [entries]);
  const pendingDeleteEntry = entries.find((item) => item.date === pendingDeleteDate) ?? null;

  const resetForm = () => {
    setEntryDate(new Date());
    setAmIn(null);
    setLunchOut(null);
    setLunchIn(null);
    setPmOut(null);
    setError(null);
  };

  const handleAddNew = () => {
    setEditingDate(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (date: string) => {
    const entry = entries.find((item) => item.date === date);
    if (!entry) return;

    setEditingDate(date);
    setEntryDate(parseDateOnly(date));
    setAmIn(entry.amIn);
    setLunchOut(entry.lunchOut);
    setLunchIn(entry.lunchIn);
    setPmOut(entry.pmOut);
    setError(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDate(null);
    resetForm();
  };

  const handleSubmit = () => {
    if (!amIn && !lunchOut && !lunchIn && !pmOut) {
      setError('Record at least one time.');
      return;
    }

    const dateKey = toDateOnlyString(entryDate);
    if (!editingDate && entries.some((item) => item.date === dateKey)) {
      setError('A time log already exists for this date — edit it instead.');
      return;
    }

    saveEntry({ date: dateKey, amIn, lunchOut, lunchIn, pmOut });
    setIsDialogOpen(false);
    setEditingDate(null);
    resetForm();
  };

  const handleRequestRemove = (date: string) => setPendingDeleteDate(date);
  const handleCancelDelete = () => setPendingDeleteDate(null);
  const handleConfirmDelete = () => {
    if (pendingDeleteDate) removeEntry(pendingDeleteDate);
    setPendingDeleteDate(null);
  };

  const handleExportPeriod = async (period: DtrPeriod) => {
    setExportError(null);
    try {
      await exportDtrDocument(buildDtrHtml({ period, entries }));
      setIsExportOpen(false);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Could not export this DTR.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <DtrRow entry={item} onEdit={handleEdit} onRemove={handleRequestRemove} />
          )}
          renderSectionHeader={({ section }) => (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <View style={styles.headerRow}>
                <BackButton />
                <Pressable
                  onPress={() => {
                    setExportError(null);
                    setIsExportOpen(true);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Export DTR"
                  style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}>
                  <Feather name="printer" size={20} color={theme.text} />
                </Pressable>
              </View>
              <ThemedText type="subtitle">DTR</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText}>
                Record your daily time in and out.
              </ThemedText>
            </>
          }
          ListEmptyComponent={
            !isLoading ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                No time logs recorded yet. Tap + to add your first one.
              </ThemedText>
            ) : null
          }
        />

        <Pressable
          onPress={handleAddNew}
          accessibilityRole="button"
          accessibilityLabel="Add time log"
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
          <Feather name="plus" size={26} color="#ffffff" />
        </Pressable>
      </SafeAreaView>

      <Modal
        visible={isDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseDialog}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={handleCloseDialog}
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
          />

          <ThemedView type="backgroundElement" style={styles.dialog}>
            <View style={styles.dialogHeader}>
              <ThemedText type="subtitle" style={styles.dialogTitle} numberOfLines={1}>
                {editingDate ? 'Edit time log' : 'Add time log'}
              </ThemedText>
              <Pressable
                onPress={handleCloseDialog}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.dialogForm}>
              <DateField
                value={entryDate}
                onChange={setEntryDate}
                maximumDate={editingDate ? undefined : today}
              />

              <View style={styles.timeGrid}>
                <TimeField label="Morning time-in" value={amIn} onChange={setAmIn} />
                <TimeField label="Lunch break-out" value={lunchOut} onChange={setLunchOut} />
              </View>
              <View style={styles.timeGrid}>
                <TimeField label="Lunch break-in" value={lunchIn} onChange={setLunchIn} />
                <TimeField label="Afternoon time-out" value={pmOut} onChange={setPmOut} />
              </View>

              {error && (
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              )}

              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.addButtonText}>
                  {editingDate ? 'Save changes' : 'Add time log'}
                </ThemedText>
              </Pressable>
            </ScrollView>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={pendingDeleteEntry !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}>
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={handleCancelDelete}
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
          />

          <ThemedView type="backgroundElement" style={styles.confirmDialog}>
            <ThemedText type="subtitle" numberOfLines={1}>
              Remove time log?
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.confirmMessage}>
              {pendingDeleteEntry
                ? `The time log for ${formatDisplayDate(parseDateOnly(pendingDeleteEntry.date))} will be permanently removed.`
                : ''}
            </ThemedText>

            <View style={styles.confirmActions}>
              <Pressable
                onPress={handleCancelDelete}
                style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold">Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelete}
                style={({ pressed }) => [
                  styles.confirmButton,
                  { backgroundColor: theme.danger },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.confirmDeleteText}>
                  Delete
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>

      <Modal
        visible={isExportOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsExportOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsExportOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
          />

          <ThemedView type="backgroundElement" style={styles.dialog}>
            <View style={styles.dialogHeader}>
              <ThemedText type="subtitle" style={styles.dialogTitle} numberOfLines={1}>
                Export DTR
              </ThemedText>
              <Pressable
                onPress={() => setIsExportOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.dialogForm}>
              {periods.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No time logs recorded yet.
                </ThemedText>
              ) : (
                periods.map((period) => (
                  <Pressable
                    key={`${period.year}-${period.month}`}
                    onPress={() => handleExportPeriod(period)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedView type="backgroundSelected" style={styles.periodRow}>
                      <View style={styles.periodInfo}>
                        <ThemedText style={styles.periodLabel}>{periodLabel(period)}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {period.entryCount} {period.entryCount === 1 ? 'day' : 'days'} recorded
                        </ThemedText>
                      </View>
                      <Feather name="printer" size={18} color={theme.textSecondary} />
                    </ThemedView>
                  </Pressable>
                ))
              )}

              {exportError && (
                <ThemedText type="small" themeColor="danger">
                  {exportError}
                </ThemedText>
              )}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.two,
  },
  subtitleText: {
    marginTop: Spacing.half,
    marginBottom: Spacing.four,
  },
  sectionHeader: {
    marginTop: Spacing.three,
  },
  addButton: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.three,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 4, color: 'rgba(0, 0, 0, 0.25)' }],
  },
  fabPressed: {
    opacity: 0.85,
  },
  modalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  dialogTitle: {
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogForm: {
    padding: Spacing.three,
    paddingTop: 0,
    gap: Spacing.three,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  confirmMessage: {
    marginBottom: Spacing.two,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confirmButton: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#ffffff',
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  periodInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  periodLabel: {
    fontWeight: '600',
  },
});

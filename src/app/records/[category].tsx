import { Feather } from '@react-native-vector-icons/feather';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
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
import { ImagePickerField } from '@/components/image-picker-field';
import { RecordFieldInput } from '@/components/record-field-input';
import { RecordRow } from '@/components/record-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  getRecordCategory,
  type RecordCategory,
  type RecordCategoryId,
} from '@/constants/record-categories';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { type RecordEntry, useRecords } from '@/hooks/use-records';
import { useTheme } from '@/hooks/use-theme';
import {
  formatDateHeading,
  formatDisplayDate,
  formatRelativeTime,
  nowInPHT,
  toDateOnlyString,
} from '@/utils/date';
import { fieldDate, formatFieldValue } from '@/utils/record-format';
import { resolveImageUri, savePickedImage } from '@/utils/record-image';

type EntrySection = {
  title: string;
  data: RecordEntry[];
};

/** Which face the entry dialog is showing; null when it's closed. */
type DialogMode = 'add' | 'details' | 'edit' | null;

type FieldErrors = Record<string, string>;

/** Groups entries into same-day sections, newest creation time first. */
function groupByCreatedDate(entries: RecordEntry[]): EntrySection[] {
  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sections: EntrySection[] = [];
  let lastDateKey = '';

  for (const entry of sorted) {
    const createdAt = new Date(entry.createdAt);
    const dateKey = toDateOnlyString(createdAt);

    if (dateKey === lastDateKey) {
      sections[sections.length - 1].data.push(entry);
    } else {
      sections.push({ title: formatDateHeading(createdAt), data: [entry] });
      lastDateKey = dateKey;
    }
  }

  return sections;
}

function entryTitle(category: RecordCategory, entry: RecordEntry): string {
  return entry.values[category.titleField] || 'Untitled';
}

/** Starting values for a new entry: now for date-times, defaults where given, blank otherwise. */
function emptyValues(category: RecordCategory): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of category.fields) {
    if (field.type === 'datetime') values[field.key] = nowInPHT().toISOString();
    else values[field.key] = field.defaultValue ?? '';
  }
  return values;
}

/** Trims text values and checks each field's rules; returns the cleaned values or per-field errors. */
function validate(
  category: RecordCategory,
  values: Record<string, string>
): { values: Record<string, string> } | { errors: FieldErrors } {
  const cleaned: Record<string, string> = {};
  const errors: FieldErrors = {};

  for (const field of category.fields) {
    const value = (values[field.key] ?? '').trim();
    cleaned[field.key] = value;

    if (!value) {
      if (field.required) errors[field.key] = `${field.label} is required.`;
      continue;
    }

    if (field.type === 'number') {
      const min = field.min ?? 0;
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < min) {
        errors[field.key] = `${field.label} must be a whole number of at least ${min}.`;
      }
    } else if (field.type === 'amount') {
      const parsed = Number(value.replace(/,/g, ''));
      if (!Number.isFinite(parsed) || parsed < 0) {
        errors[field.key] = `${field.label} must be a valid amount.`;
      } else {
        cleaned[field.key] = String(parsed);
      }
    } else if (field.type === 'datetime' && new Date(value).getTime() > nowInPHT().getTime()) {
      errors[field.key] = `${field.label} can't be in the future.`;
    }
  }

  return Object.keys(errors).length > 0 ? { errors } : { values: cleaned };
}

export default function RecordCategoryScreen() {
  const { category: categoryParam } = useLocalSearchParams<{ category: string }>();
  const category = getRecordCategory(categoryParam ?? '');

  if (!category) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.notFound]}>
          <BackButton />
          <ThemedText type="subtitle">Category not found</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Go back and pick a category from Records.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return <CategoryEntries category={category} />;
}

function CategoryEntries({ category }: { category: RecordCategory }) {
  const { entries: allEntries, isLoading, addEntry, updateEntry, removeEntry } = useRecords();
  const theme = useTheme();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [values, setValues] = useState(() => emptyValues(category));
  // What the photo field previews. `imageChanged` tells a kept image (already
  // saved) apart from a freshly picked one that still needs saving.
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  const entries = useMemo(
    () => allEntries.filter((entry) => entry.category === category.id),
    [allEntries, category.id]
  );
  const sections = useMemo(() => groupByCreatedDate(entries), [entries]);
  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? null;
  const pendingDeleteEntry = entries.find((entry) => entry.id === pendingDeleteId) ?? null;

  const handleFieldChange = (key: string) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors(({ [key]: _cleared, ...rest }) => rest);
    }
    if (error) setError(null);
  };

  const handleImageChange = (uri: string | null) => {
    setImageUri(uri);
    setImageChanged(true);
    if (error) setError(null);
  };

  const resetForm = () => {
    setValues(emptyValues(category));
    setImageUri(null);
    setImageChanged(false);
    setFieldErrors({});
    setError(null);
  };

  const handleAddNew = () => {
    setSelectedId(null);
    resetForm();
    setDialogMode('add');
  };

  const handleOpen = (id: string) => {
    setSelectedId(id);
    setDialogMode('details');
  };

  const handleStartEdit = () => {
    if (!selectedEntry) return;

    setValues({ ...emptyValues(category), ...selectedEntry.values });
    setImageUri(selectedEntry.imageRef ? resolveImageUri(selectedEntry.imageRef) : null);
    setImageChanged(false);
    setFieldErrors({});
    setError(null);
    setDialogMode('edit');
  };

  // Cancelling an edit discards the draft and goes back to the saved details.
  const handleCancelEdit = () => {
    resetForm();
    setDialogMode('details');
  };

  const handleCloseDialog = () => {
    if (isSaving) return;
    setDialogMode(null);
    setSelectedId(null);
    resetForm();
  };

  const handleRequestRemove = (id: string) => {
    setPendingDeleteId(id);
  };

  const handleCancelDelete = () => {
    setPendingDeleteId(null);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteId) removeEntry(pendingDeleteId);
    setPendingDeleteId(null);
  };

  const handleSubmit = async () => {
    if (isSaving) return;

    const result = validate(category, values);
    if ('errors' in result) {
      setFieldErrors(result.errors);
      return;
    }

    const isEditing = dialogMode === 'edit' && selectedEntry !== null;
    let imageRef: string | null = isEditing ? (selectedEntry.imageRef ?? null) : null;
    if (imageChanged) {
      if (imageUri) {
        setIsSaving(true);
        try {
          imageRef = await savePickedImage(imageUri);
        } catch (caught) {
          console.warn('Failed to save entry photo', caught);
          setError("Couldn't save the photo. Try another one.");
          return;
        } finally {
          setIsSaving(false);
        }
      } else {
        imageRef = null;
      }
    }

    // Keep values from fields this category no longer shows (e.g. from older
    // versions of the form) instead of silently dropping them.
    const input = {
      values: { ...(isEditing ? selectedEntry.values : {}), ...result.values },
      imageRef,
    };

    if (isEditing) {
      updateEntry(selectedEntry.id, input);
      resetForm();
      setDialogMode('details');
    } else {
      addEntry(category.id as RecordCategoryId, input);
      setDialogMode(null);
      resetForm();
    }
  };

  const isFormMode = dialogMode === 'add' || dialogMode === 'edit';
  const dialogTitle =
    dialogMode === 'add'
      ? 'Add entry'
      : dialogMode === 'edit'
        ? 'Edit entry'
        : selectedEntry
          ? entryTitle(category, selectedEntry)
          : '';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecordRow
              id={item.id}
              title={entryTitle(category, item)}
              onOpen={handleOpen}
              onRemove={handleRequestRemove}
            />
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
              <BackButton />
              <ThemedText type="subtitle">
                {category.emoji} {category.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText}>
                {category.description}
              </ThemedText>
            </>
          }
          ListEmptyComponent={
            !isLoading ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                No entries yet. Tap + to add your first one.
              </ThemedText>
            ) : null
          }
        />

        <Pressable
          onPress={handleAddNew}
          accessibilityRole="button"
          accessibilityLabel={`Add ${category.label} entry`}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
          <Feather name="plus" size={26} color="#ffffff" />
        </Pressable>
      </SafeAreaView>

      <Modal
        visible={dialogMode !== null}
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
              <View style={styles.dialogTitle}>
                <ThemedText type="subtitle" numberOfLines={1}>
                  {dialogTitle}
                </ThemedText>
                {isFormMode && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {category.emoji} {category.label}
                  </ThemedText>
                )}
              </View>
              <Pressable
                onPress={handleCloseDialog}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            {dialogMode === 'details' && selectedEntry && (
              <EntryDetails category={category} entry={selectedEntry} onEdit={handleStartEdit} />
            )}

            {isFormMode && (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.dialogForm}>
                <ImagePickerField value={imageUri} onChange={handleImageChange} />

                {category.fields.map((field) => (
                  <RecordFieldInput
                    key={field.key}
                    field={field}
                    value={values[field.key] ?? ''}
                    onChange={handleFieldChange(field.key)}
                    error={fieldErrors[field.key]}
                  />
                ))}

                {error && (
                  <ThemedText type="small" themeColor="danger">
                    {error}
                  </ThemedText>
                )}

                <View style={styles.formActions}>
                  {dialogMode === 'edit' && (
                    <Pressable
                      onPress={handleCancelEdit}
                      disabled={isSaving}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        { backgroundColor: theme.backgroundSelected },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="smallBold">Cancel</ThemedText>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={handleSubmit}
                    disabled={isSaving}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (pressed || isSaving) && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold" style={styles.primaryButtonText}>
                      {isSaving
                        ? 'Saving…'
                        : dialogMode === 'edit'
                          ? 'Save changes'
                          : 'Add entry'}
                    </ThemedText>
                  </Pressable>
                </View>
              </ScrollView>
            )}
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
              Remove entry?
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.confirmMessage}>
              {pendingDeleteEntry
                ? `"${entryTitle(category, pendingDeleteEntry)}" will be permanently removed.`
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
    </ThemedView>
  );
}

type EntryDetailsProps = {
  category: RecordCategory;
  entry: RecordEntry;
  onEdit: () => void;
};

/** Read-only view of every field of an entry, with a way into edit mode. */
function EntryDetails({ category, entry, onEdit }: EntryDetailsProps) {
  const details: { label: string; value: string }[] = [];
  for (const field of category.fields) {
    if (field.key === category.titleField) continue; // Already the dialog title.
    const value = entry.values[field.key] ?? '';
    details.push({ label: field.label, value: formatFieldValue(field, value) });

    const date = fieldDate(field, value);
    if (field.relativeLabel && date) {
      details.push({ label: field.relativeLabel, value: formatRelativeTime(date) });
    }
  }
  details.push({ label: 'Added', value: formatDisplayDate(new Date(entry.createdAt)) });

  return (
    <ScrollView contentContainerStyle={styles.dialogForm}>
      {entry.imageRef ? (
        <Image
          source={{ uri: resolveImageUri(entry.imageRef) }}
          style={styles.detailImage}
          contentFit="cover"
          accessibilityLabel={`Photo of ${entryTitle(category, entry)}`}
        />
      ) : null}

      <View style={styles.detailList}>
        {details.map((detail) => (
          <View key={detail.label} style={styles.detailRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {detail.label}
            </ThemedText>
            <ThemedText type="small" style={styles.detailValue}>
              {detail.value}
            </ThemedText>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [
          styles.primaryButton,
          styles.editButton,
          pressed && styles.pressed,
        ]}>
        <Feather name="edit-2" size={16} color="#ffffff" />
        <ThemedText type="smallBold" style={styles.primaryButtonText}>
          Edit
        </ThemedText>
      </Pressable>
    </ScrollView>
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
  notFound: {
    padding: Spacing.four,
    gap: Spacing.one,
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
  primaryButton: {
    flex: 1,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  editButton: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  detailImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.two,
  },
  detailList: {
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: 'right',
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
});

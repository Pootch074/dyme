import { useMemo, useState } from 'react';

import type { RecordCategory, RecordCategoryId } from '@/constants/record-categories';
import { type RecordEntry, useRecords } from '@/hooks/use-records';
import { formatDateHeading, nowInPHT, toDateOnlyString } from '@/utils/date';
import { type FieldErrors, validateEntryValues } from '@/utils/record-validation';
import { resolveImageUri, savePickedImage } from '@/utils/record-image';

export type EntrySection = {
  title: string;
  data: RecordEntry[];
};

/** Which face the entry dialog is showing; null when it's closed. */
export type DialogMode = 'add' | 'details' | 'edit' | null;


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

export function entryTitle(category: RecordCategory, entry: RecordEntry): string {
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

/**
 * State and actions for a category's entry list and its add / details / edit
 * dialog, shared by the platform-specific screens so they behave identically.
 */
export function useEntryEditor(category: RecordCategory) {
  const { entries: allEntries, isLoading, addEntry, updateEntry, removeEntry } = useRecords();

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

  const changeField = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors(({ [key]: _cleared, ...rest }) => rest);
    }
    if (error) setError(null);
  };

  const changeImage = (uri: string | null) => {
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

  const startAdd = () => {
    setSelectedId(null);
    resetForm();
    setDialogMode('add');
  };

  const openEntry = (id: string) => {
    setSelectedId(id);
    setDialogMode('details');
  };

  const startEdit = () => {
    if (!selectedEntry) return;

    setValues({ ...emptyValues(category), ...selectedEntry.values });
    setImageUri(selectedEntry.imageRef ? resolveImageUri(selectedEntry.imageRef) : null);
    setImageChanged(false);
    setFieldErrors({});
    setError(null);
    setDialogMode('edit');
  };

  // Cancelling an edit discards the draft and goes back to the saved details.
  const cancelEdit = () => {
    resetForm();
    setDialogMode('details');
  };

  const closeDialog = () => {
    if (isSaving) return;
    setDialogMode(null);
    setSelectedId(null);
    resetForm();
  };

  const requestRemove = (id: string) => {
    setPendingDeleteId(id);
  };

  const cancelRemove = () => {
    setPendingDeleteId(null);
  };

  const confirmRemove = () => {
    if (pendingDeleteId) removeEntry(pendingDeleteId);
    setPendingDeleteId(null);
  };

  const submit = async () => {
    if (isSaving) return;

    const result = validateEntryValues(category, values);
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

  return {
    isLoading,
    sections,
    selectedEntry,
    pendingDeleteEntry,
    dialogMode,
    dialogTitle,
    isFormMode,
    values,
    imageUri,
    isSaving,
    fieldErrors,
    error,
    changeField,
    changeImage,
    startAdd,
    openEntry,
    startEdit,
    cancelEdit,
    closeDialog,
    requestRemove,
    cancelRemove,
    confirmRemove,
    submit,
  };
}

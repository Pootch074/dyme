import { useState } from 'react';

import { getRecordCategory, type RecordCategory } from '@/constants/record-categories';
import { useRecords } from '@/hooks/use-records';
import { pickFile } from '@/utils/pick-file';
import {
  buildRecordsCsvFile,
  buildRecordsTemplateFile,
  importInputs,
  type ImportOptions,
  type ImportPreview,
  prepareRecordImport,
  summarizeImport,
} from '@/utils/records-csv';
import { saveFile } from '@/utils/save-file';

/** Bigger than any realistic records file, and small enough to read and preview comfortably. */
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type ImportState =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'error'; message: string }
  | { kind: 'preview'; preview: ImportPreview }
  /** `category` is set when every imported record went into that one category. */
  | { kind: 'done'; message: string; category: RecordCategory | null };

export type FileStatus =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

const NO_FIXES: ImportOptions = { fixInvalid: false, includeDuplicates: false };

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/**
 * State for Records → Import & export (shared by the iOS/web and Android
 * screens): importing a CSV of any categories through a checked preview, and
 * saving every category's entries, or the import template, as one CSV.
 */
export function useRecordsTransfer() {
  const { entries, isLoading, importEntries } = useRecords();
  const [importState, setImportState] = useState<ImportState>({ kind: 'idle' });
  const [options, setOptions] = useState<ImportOptions>(NO_FIXES);
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [fileStatus, setFileStatus] = useState<FileStatus>({ kind: 'idle' });

  const chooseFile = async () => {
    if (importState.kind === 'reading' || isLoading) return;
    try {
      const file = await pickFile();
      if (!file) return; // The picker was closed.
      if (file.size !== null && file.size > MAX_IMPORT_BYTES) {
        setImportState({
          kind: 'error',
          message: `"${file.name}" is too large to import (over 5 MB).`,
        });
        return;
      }
      setImportState({ kind: 'reading' });
      const text = await file.readText();
      const result = prepareRecordImport({ ...file, text }, entries);
      setOptions(NO_FIXES);
      setImportState(
        'error' in result
          ? { kind: 'error', message: result.error }
          : { kind: 'preview', preview: result.preview }
      );
    } catch (error) {
      console.warn('Failed to read import file', error);
      setImportState({ kind: 'error', message: "Couldn't read that file. Please try another one." });
    }
  };

  const confirmImport = () => {
    if (importState.kind !== 'preview') return;
    const { preview } = importState;
    const inputs = importInputs(preview, options);
    importEntries(inputs);
    const categoryIds = [...new Set(inputs.map((input) => input.category))];
    const only = categoryIds.length === 1 ? (getRecordCategory(categoryIds[0]) ?? null) : null;
    setImportState({
      kind: 'done',
      category: only,
      message: `Imported ${plural(inputs.length, 'record', 'records')} into ${
        only ? only.label : plural(categoryIds.length, 'category', 'categories')
      }.`,
    });
  };

  const save = async (build: () => ReturnType<typeof buildRecordsTemplateFile>) => {
    if (fileStatus.kind === 'working') return;
    setFileStatus({ kind: 'working' });
    try {
      const file = build();
      const result = await saveFile(file);
      setFileStatus(
        result === 'cancelled'
          ? { kind: 'idle' }
          : {
              kind: 'done',
              message: result === 'shared' ? `Created ${file.fileName}.` : `Saved ${file.fileName}.`,
            }
      );
    } catch (error) {
      console.warn('Failed to save CSV', error);
      setFileStatus({ kind: 'error', message: "Couldn't save the file. Please try again." });
    }
  };

  const categoryCount = new Set(entries.map((entry) => entry.category)).size;

  return {
    isLoading,
    importState,
    options,
    setOptions: (change: Partial<ImportOptions>) => setOptions((prev) => ({ ...prev, ...change })),
    summary: importState.kind === 'preview' ? summarizeImport(importState.preview, options) : null,
    chooseFile,
    confirmImport,
    resetImport: () => setImportState({ kind: 'idle' }),

    includeSensitive,
    setIncludeSensitive,
    fileStatus,
    /** Records saved, across every category. */
    entryCount: entries.length,
    /** Categories that have at least one record. */
    categoryCount,
    exportAll: () => save(() => buildRecordsCsvFile(entries, includeSensitive)),
    downloadTemplate: () => save(buildRecordsTemplateFile),
  };
}

/** A preview row's status, for its label. */
export function rowStatus(
  row: ImportPreview['rows'][number],
  options: ImportOptions
): { label: string; tone: 'ok' | 'warning' | 'error' | 'muted' } {
  const fixed = row.errors.length > 0 && row.fixable && options.fixInvalid;
  if (row.errors.length > 0 && !fixed) {
    return { label: row.fixable ? 'Has errors' : 'Skipped', tone: 'error' };
  }
  if (row.duplicateOf !== null) {
    const label = row.duplicateOf === 'existing' ? 'Already saved' : `Same as row ${row.duplicateOf}`;
    return options.includeDuplicates
      ? { label: `${label} · importing`, tone: 'warning' }
      : { label, tone: 'muted' };
  }
  if (fixed) return { label: 'Import with blanks', tone: 'warning' };
  return { label: 'Ready', tone: 'ok' };
}

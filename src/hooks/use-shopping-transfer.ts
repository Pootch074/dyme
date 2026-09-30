import { useState } from 'react';

import { useShopping } from '@/hooks/use-shopping';
import type { ExportFile } from '@/utils/data-export';
import { pickFile } from '@/utils/pick-file';
import { saveFile } from '@/utils/save-file';
import { formatShoppingDateTime } from '@/utils/shopping';
import {
  buildShoppingCsvFile,
  buildShoppingTemplateFile,
  importInputs,
  type ImportOptions,
  type ImportPreview,
  type ImportSession,
  prepareShoppingImport,
  summarizeImport,
} from '@/utils/shopping-csv';

/** Bigger than any realistic shopping file, and small enough to read and preview comfortably. */
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type ImportState =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'error'; message: string }
  | { kind: 'preview'; preview: ImportPreview }
  | { kind: 'done'; message: string };

export type FileStatus =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

const NO_FIXES: ImportOptions = { fixInvalid: false, includeDuplicates: false };

export const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/**
 * State for Shopping Calculator → Import & export (shared by the iOS/web and
 * Android screens): importing every session and its items from one CSV
 * through a checked preview, and saving them all, or the template, as CSV.
 * Importing only adds sessions; saved ones are never changed.
 */
export function useShoppingTransfer() {
  const { records, isLoading, importRecords } = useShopping();
  const [importState, setImportState] = useState<ImportState>({ kind: 'idle' });
  const [options, setOptions] = useState<ImportOptions>(NO_FIXES);
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
      const result = prepareShoppingImport({ ...file, text }, records);
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
    const inputs = importInputs(importState.preview, options);
    importRecords(inputs);
    const items = inputs.reduce((sum, input) => sum + input.items.length, 0);
    setImportState({
      kind: 'done',
      message: `Imported ${plural(inputs.length, 'shopping session', 'shopping sessions')} with ${plural(items, 'item', 'items')}.`,
    });
  };

  const save = async (build: () => ExportFile) => {
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

  return {
    isLoading,
    importState,
    options,
    setOptions: (change: Partial<ImportOptions>) => setOptions((prev) => ({ ...prev, ...change })),
    summary: importState.kind === 'preview' ? summarizeImport(importState.preview, options) : null,
    chooseFile,
    confirmImport,
    resetImport: () => setImportState({ kind: 'idle' }),

    fileStatus,
    /** Saved shopping sessions. */
    sessionCount: records.length,
    /** Items across every session. */
    itemCount: records.reduce((sum, record) => sum + record.items.length, 0),
    exportAll: () => save(() => buildShoppingCsvFile(records)),
    downloadTemplate: () => save(buildShoppingTemplateFile),
  };
}

/** A preview session's status, for its label. */
export function sessionStatus(
  session: ImportSession,
  options: ImportOptions
): { label: string; tone: 'ok' | 'warning' | 'error' | 'muted' } {
  const fixed = session.errors.length > 0 && session.fixable && options.fixInvalid;
  if (session.errors.length > 0 && !fixed) {
    return { label: session.fixable ? 'Has errors' : 'Skipped', tone: 'error' };
  }
  if (session.duplicateOf !== null) {
    const label =
      session.duplicateOf === 'existing' ? 'Already saved' : `Same as row ${session.duplicateOf}`;
    return options.includeDuplicates
      ? { label: `${label} · importing`, tone: 'warning' }
      : { label, tone: 'muted' };
  }
  if (fixed) return { label: 'Import without errors', tone: 'warning' };
  return { label: 'Ready', tone: 'ok' };
}

/** e.g. "Row 2 · September 23, 2026 — 09:30 AM · 3 items". */
export function sessionDetails(session: ImportSession): string {
  const when = session.dateTime ? formatShoppingDateTime(new Date(session.dateTime)) : null;
  const items = plural(session.items.length, 'item', 'items');
  return [`Row ${session.line}`, when, items].filter(Boolean).join(' · ');
}

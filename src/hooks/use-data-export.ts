import { useEffect, useState } from 'react';

import {
  buildExportFile,
  type ExportFormat,
  type ExportTable,
  loadExportTables,
} from '@/utils/data-export';
import { saveFile } from '@/utils/save-file';

export type ExportStatus =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

/**
 * State for the Export data screen (shared by the iOS/web and Android
 * versions): the format, which table a CSV holds, whether sensitive values
 * are included, and the export itself.
 */
export function useDataExport() {
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [tables, setTables] = useState<ExportTable[] | null>(null);
  const [csvTableId, setCsvTableId] = useState<string | null>(null);
  const [status, setStatus] = useState<ExportStatus>({ kind: 'idle' });

  // What's available to export, for the CSV table list and the summary.
  useEffect(() => {
    let cancelled = false;
    loadExportTables({ includeSensitive: false })
      .then((loaded) => {
        if (cancelled) return;
        setTables(loaded);
        setCsvTableId((current) => current ?? loaded[0]?.id ?? null);
      })
      .catch((error) => {
        console.warn('Failed to load data for export', error);
        if (!cancelled) setTables([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runExport = async () => {
    if (status.kind === 'working') return;
    setStatus({ kind: 'working' });
    try {
      // Read again so the file has the latest data and the chosen masking.
      const latest = await loadExportTables({ includeSensitive });
      const chosen =
        format === 'xlsx' ? latest : latest.filter((table) => table.id === csvTableId);
      if (chosen.length === 0) {
        setStatus({ kind: 'error', message: 'There is nothing to export yet.' });
        return;
      }

      const file = buildExportFile(format, chosen);
      const result = await saveFile(file);
      setStatus(
        result === 'cancelled'
          ? { kind: 'idle' }
          : {
              kind: 'done',
              message:
                result === 'shared' ? `Created ${file.fileName}.` : `Saved ${file.fileName}.`,
            }
      );
    } catch (error) {
      console.warn('Export failed', error);
      setStatus({ kind: 'error', message: "Couldn't export your data. Please try again." });
    }
  };

  return {
    format,
    setFormat: (next: ExportFormat) => {
      setFormat(next);
      setStatus({ kind: 'idle' });
    },
    includeSensitive,
    setIncludeSensitive,
    /** Null while loading. */
    tables,
    csvTableId,
    setCsvTableId,
    status,
    runExport,
  };
}

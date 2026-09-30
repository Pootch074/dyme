import { loadDtrEntries } from '@/hooks/use-dtr';
import { loadProfile } from '@/hooks/use-profile';
import { loadEntries } from '@/hooks/use-records';
import { loadShoppingRecords } from '@/hooks/use-shopping';
import { nowInPHT, toDateOnlyString } from '@/utils/date';
import { recordsSheet } from '@/utils/records-csv';
import { shoppingSheet } from '@/utils/shopping-csv';
import { buildCsv, buildXlsx, type Sheet } from '@/utils/spreadsheet';

/** One exportable table: a worksheet in Excel, or a file of its own as CSV. */
export type ExportTable = Sheet & {
  id: string;
  /** Short name for the CSV file name, e.g. "bank-finance". */
  slug: string;
};

export type ExportFormat = 'xlsx' | 'csv';

export type ExportFile = {
  fileName: string;
  mimeType: string;
  /** iOS type identifier, for the share sheet. */
  uti: string;
  data: Uint8Array | string;
};

export type ExportOptions = {
  /**
   * Passwords and card/account numbers are masked (•••• 7890) unless this is
   * on, so an exported file doesn't give them away by default.
   */
  includeSensitive: boolean;
};

/**
 * Everything the app stores, as tables: the profile, DTR, shopping (every
 * session and its items in one table), and Records (every category in one table). Tables
 * with nothing in them are left out. Photos aren't included.
 */
export async function loadExportTables(options: ExportOptions): Promise<ExportTable[]> {
  const [profile, dtr, shopping, records] = await Promise.all([
    loadProfile(),
    loadDtrEntries(),
    loadShoppingRecords(),
    loadEntries(),
  ]);
  const tables: ExportTable[] = [];

  if (Object.values(profile).some(Boolean)) {
    tables.push({
      id: 'profile',
      slug: 'profile',
      name: 'Profile',
      columns: ['First name', 'Last name', 'Email', 'Phone'],
      rows: [[profile.firstName, profile.lastName, profile.email, profile.phone]],
    });
  }

  if (dtr.length > 0) {
    tables.push({
      id: 'dtr',
      slug: 'dtr',
      name: 'DTR',
      columns: ['Date', 'Morning time-in', 'Lunch break-out', 'Lunch break-in', 'Afternoon time-out'],
      rows: [...dtr]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((entry) => [
          entry.date,
          entry.amIn ?? '',
          entry.lunchOut ?? '',
          entry.lunchIn ?? '',
          entry.pmOut ?? '',
        ]),
    });
  }

  // Every session and its items in one table, in the layout Shopping Calculator →
  // Import & export reads back as is.
  if (shopping.length > 0) {
    tables.push({ ...shoppingSheet(shopping), id: 'shopping', slug: 'shopping' });
  }

  // Every category in one table, in the layout Records → Import & export reads back as is.
  const recordsTable = recordsSheet(records, options.includeSensitive);
  if (recordsTable.rows.length > 0) {
    tables.push({ ...recordsTable, id: 'records', slug: 'records' });
  }

  return tables;
}

/** Builds the file to save: every table as an Excel workbook, or one table as CSV. */
export function buildExportFile(format: ExportFormat, tables: ExportTable[]): ExportFile {
  const date = toDateOnlyString(nowInPHT());

  if (format === 'xlsx') {
    return {
      fileName: `dyme-export-${date}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      uti: 'org.openxmlformats.spreadsheetml.sheet',
      data: buildXlsx(tables),
    };
  }

  const [table] = tables;
  return {
    fileName: `dyme-${table.slug}-${date}.csv`,
    mimeType: 'text/csv',
    uti: 'public.comma-separated-values-text',
    data: buildCsv(table),
  };
}

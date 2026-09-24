import { RECORD_CATEGORIES, type RecordField } from '@/constants/record-categories';
import { loadDtrEntries } from '@/hooks/use-dtr';
import { loadProfile } from '@/hooks/use-profile';
import { loadEntries } from '@/hooks/use-records';
import { loadShoppingRecords } from '@/hooks/use-shopping';
import { nowInPHT, toDateOnlyString } from '@/utils/date';
import { maskValue } from '@/utils/record-format';
import { itemTotal, recordItemCount, recordTotal } from '@/utils/shopping';
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

const pesos = (centavos: number) => centavos / 100;

/** "2026-08-15 14:05" in the device's time: sortable, and readable in a spreadsheet. */
function dateTimeCell(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${toDateOnlyString(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function recordCell(field: RecordField, value: string, options: ExportOptions): string | number {
  if (!value) return '';
  if (field.sensitive && !options.includeSensitive) return maskValue(field, value);
  if (field.type === 'datetime') return dateTimeCell(value);
  if (field.type === 'amount' || field.type === 'number') {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
  return value;
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Everything the app stores, as tables: the profile, DTR, shopping (trips and
 * their items), and one table per Records category that has entries. Tables
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

  if (shopping.length > 0) {
    const trips = [...shopping].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    tables.push({
      id: 'shopping',
      slug: 'shopping',
      name: 'Shopping',
      columns: [
        'Location',
        'Date and time',
        'Budget (PHP)',
        'Total expenses (PHP)',
        'Total items',
        'Items in cart',
      ],
      rows: trips.map((trip) => [
        trip.location,
        dateTimeCell(trip.dateTime),
        trip.budgetCentavos === null ? '' : pesos(trip.budgetCentavos),
        pesos(recordTotal(trip)),
        recordItemCount(trip),
        `${trip.items.filter((item) => item.inCart).length} of ${trip.items.length}`,
      ]),
    });

    const items = trips.flatMap((trip) =>
      trip.items.map((item, index) => [
        trip.location,
        dateTimeCell(trip.dateTime),
        index + 1,
        item.name,
        pesos(item.priceCentavos),
        item.quantity,
        pesos(itemTotal(item)),
        item.inCart ? 'Yes' : 'No',
      ])
    );
    if (items.length > 0) {
      tables.push({
        id: 'shopping-items',
        slug: 'shopping-items',
        name: 'Shopping items',
        columns: [
          'Location',
          'Date and time',
          'Position',
          'Item',
          'Price (PHP)',
          'Quantity',
          'Item total (PHP)',
          'In cart',
        ],
        rows: items,
      });
    }
  }

  for (const category of RECORD_CATEGORIES) {
    const entries = records
      .filter((entry) => entry.category === category.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (entries.length === 0) continue;

    const fields = category.fields as readonly RecordField[];
    tables.push({
      id: `records-${category.id}`,
      slug: slugify(category.label),
      name: `Records - ${category.label}`,
      // Amount columns say they're in pesos, e.g. "Cost (PHP)".
      columns: [
        ...fields.map((field) => (field.type === 'amount' ? `${field.label} (PHP)` : field.label)),
        'Added',
      ],
      rows: entries.map((entry) => [
        ...fields.map((field) => recordCell(field, entry.values[field.key] ?? '', options)),
        dateTimeCell(entry.createdAt),
      ]),
    });
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

import type { ExportFile } from '@/utils/data-export';
import { formatSortableDateTime, nowInPHT, parseDateTimeText, toDateOnlyString } from '@/utils/date';
import { moneyErrorMessage, parseMoneyInput } from '@/utils/money';
import {
  itemTotal,
  productKey,
  recordItemCount,
  recordTotal,
  type ShoppingRecord,
} from '@/utils/shopping';
import { buildCsv, parseCsv, type Sheet } from '@/utils/spreadsheet';

/*
 * The Shopping Calculator CSV layout, shared by export, the import template
 * and import so an exported file can be imported back as is: one file for
 * every shopping session, one row per item. Each row repeats its session's
 * details (location, date and time, budget), and a "Session" number ties the
 * rows of one session together; a session without items has one row with the
 * item columns blank. Rows keep the items' order. The totals are there to
 * read in a spreadsheet; import works them out again from the items. Dates
 * and times are "YYYY-MM-DD HH:mm" (device time).
 */

export const SHOPPING_COLUMNS = {
  session: 'Session',
  location: 'Location',
  dateTime: 'Date and time',
  budget: 'Budget (PHP)',
  total: 'Total expenses (PHP)',
  itemCount: 'Total items',
  position: 'Item #',
  item: 'Item',
  price: 'Price (PHP)',
  quantity: 'Quantity',
  itemTotal: 'Item total (PHP)',
  inCart: 'In cart',
  added: 'Added',
} as const;

type ColumnId = keyof typeof SHOPPING_COLUMNS;

const COLUMN_IDS = Object.keys(SHOPPING_COLUMNS) as ColumnId[];

const pesos = (centavos: number) => centavos / 100;

function dateTimeCell(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : formatSortableDateTime(date);
}

/** A table's rows, from each row's cells by column. */
function sheet(rows: Partial<Record<ColumnId, string | number>>[]): Sheet {
  return {
    name: 'Shopping',
    columns: COLUMN_IDS.map((id) => SHOPPING_COLUMNS[id]),
    rows: rows.map((row) => COLUMN_IDS.map((id) => row[id] ?? '')),
  };
}

/** One session's rows: one per item, or a single row when it has none. */
function sessionRows(record: ShoppingRecord, session: number): Partial<Record<ColumnId, string | number>>[] {
  const details = {
    session,
    location: record.location,
    dateTime: dateTimeCell(record.dateTime),
    budget: record.budgetCentavos === null ? '' : pesos(record.budgetCentavos),
    total: pesos(recordTotal(record)),
    itemCount: recordItemCount(record),
    added: dateTimeCell(record.createdAt),
  };
  if (record.items.length === 0) return [details];
  return record.items.map((item, index) => ({
    ...details,
    position: index + 1,
    item: item.name,
    price: pesos(item.priceCentavos),
    quantity: item.quantity,
    itemTotal: pesos(itemTotal(item)),
    inCart: item.inCart ? 'Yes' : 'No',
  }));
}

/** Every shopping session and its items as one table, oldest session first. */
export function shoppingSheet(records: readonly ShoppingRecord[]): Sheet {
  const sessions = [...records].sort(
    (a, b) => a.dateTime.localeCompare(b.dateTime) || a.createdAt.localeCompare(b.createdAt)
  );
  return sheet(sessions.flatMap((record, index) => sessionRows(record, index + 1)));
}

function csvFile(fileName: string, table: Sheet): ExportFile {
  return {
    fileName,
    mimeType: 'text/csv',
    uti: 'public.comma-separated-values-text',
    data: buildCsv(table),
  };
}

/** Every shopping session and its items as one CSV file that Import reads back. */
export function buildShoppingCsvFile(records: readonly ShoppingRecord[]): ExportFile {
  return csvFile(`dyme-shopping-${toDateOnlyString(nowInPHT())}.csv`, shoppingSheet(records));
}

/** The import template: every column, and two example sessions to replace. */
export function buildShoppingTemplateFile(): ExportFile {
  const day = toDateOnlyString(new Date(nowInPHT().getTime() - 7 * 24 * 60 * 60 * 1000));
  const example = (
    location: string,
    time: string,
    budgetPesos: number | null,
    items: [name: string, pricePesos: number, quantity: number, inCart: boolean][]
  ): ShoppingRecord => ({
    id: '',
    location,
    // Local time, as a saved session's date and time is.
    dateTime: new Date(`${day}T${time}`).toISOString(),
    budgetCentavos: budgetPesos === null ? null : budgetPesos * 100,
    items: items.map(([name, pricePesos, quantity, inCart]) => ({
      id: '',
      name,
      priceCentavos: Math.round(pricePesos * 100),
      quantity,
      inCart,
    })),
    // Blank "Added": imported as the time of import.
    createdAt: '',
  });
  const records = [
    example('Sample supermarket', '09:30', 1500, [
      ['Rice 5kg', 320, 1, true],
      ['Canned tuna', 45.5, 3, false],
    ]),
    example('Sample hardware store', '14:00', null, [['Light bulb', 120, 2, false]]),
  ];
  return csvFile(
    'dyme-shopping-template.csv',
    sheet(records.flatMap((record, index) => sessionRows(record, index + 1)))
  );
}

// ---------------------------------------------------------------------------
// Import

export type ImportItem = {
  name: string;
  priceCentavos: number;
  quantity: number;
  inCart: boolean;
};

/** One shopping session of the file (its rows), checked and converted to how sessions are stored. */
export type ImportSession = {
  /** First line of the file with this session (the header is line 1). */
  line: number;
  location: string;
  /** ISO timestamp, or null when the file's is missing or invalid. */
  dateTime: string | null;
  budgetCentavos: number | null;
  /** When it was added (ISO), or null to use the import time. */
  createdAt: string | null;
  /** The valid items, in the file's order; items with errors are left out. */
  items: ImportItem[];
  /** Items with errors, left out. */
  skippedItems: number;
  errors: string[];
  /** Every error is in an item, the budget or "Added", so leaving those out makes the session valid. */
  fixable: boolean;
  /** Matches a session already in the app, or an earlier session of the file (its first line). */
  duplicateOf: 'existing' | number | null;
};

export type ImportPreview = {
  fileName: string;
  sessions: ImportSession[];
  /** Headers that aren't a column of the layout. */
  ignoredColumns: string[];
};

export type ImportOptions = {
  /** Import sessions with invalid items, budgets or "Added" dates, leaving those out. */
  fixInvalid: boolean;
  /** Import sessions that duplicate saved sessions (or earlier ones in the file) too. */
  includeDuplicates: boolean;
};

export type ImportSummary = {
  ready: number;
  invalid: number;
  fixable: number;
  duplicates: number;
  toImport: number;
  itemsToImport: number;
};

export type ShoppingImportInput = {
  location: string;
  dateTime: string;
  budgetCentavos: number | null;
  createdAt: string | null;
  items: ImportItem[];
};

const CSV_MIME_TYPES = ['text/csv', 'text/comma-separated-values', 'application/csv'];

/** A header compared loosely: case, spacing and a "(PHP)" suffix don't matter. */
function normalizeHeader(text: string): string {
  return text
    .toLowerCase()
    .replace(/\(php\)$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const YES = ['yes', 'y', 'true', '1', '✓', 'x'];
const NO = ['no', 'n', 'false', '0', ''];

/**
 * What identifies a session for spotting duplicates: its location, date and
 * time to the minute (as exported), and its items.
 */
function duplicateKey(session: {
  location: string;
  dateTime: string;
  items: readonly Omit<ImportItem, 'inCart'>[];
}): string {
  const items = session.items
    .map((item) => `${productKey(item.name)}\u0001${item.priceCentavos}\u0001${item.quantity}`)
    .sort()
    .join('\u0002');
  return `${productKey(session.location)}\u0003${dateTimeCell(session.dateTime)}\u0003${items}`;
}

/**
 * Reads and checks an import file. Returns a problem with the file as a whole
 * (not a CSV, no header, required column missing, …), or a preview of every
 * session with its errors and duplicates, for the user to confirm.
 */
export function prepareShoppingImport(
  file: { name: string; mimeType?: string | null; text: string },
  existing: readonly ShoppingRecord[]
): { preview: ImportPreview } | { error: string } {
  const isCsvName = /\.csv$/i.test(file.name);
  const isCsvType = CSV_MIME_TYPES.includes(file.mimeType ?? '');
  // An Excel workbook is a zip file, which starts with "PK".
  if ((!isCsvName && !isCsvType) || file.text.startsWith('PK')) {
    return {
      error: `"${file.name}" isn't a CSV file. Choose a .csv file (in Excel, use File › Save As › CSV UTF-8).`,
    };
  }

  const [headerRow, ...dataRows] = parseCsv(file.text);
  if (!headerRow) return { error: 'The file is empty.' };

  // Where each column is, by header; later repeats are ignored.
  const columnOf = new Map<ColumnId, number>();
  const ignoredColumns: string[] = [];
  headerRow.forEach((raw, index) => {
    const header = raw.trim();
    const id = COLUMN_IDS.find(
      (candidate) => normalizeHeader(SHOPPING_COLUMNS[candidate]) === normalizeHeader(header)
    );
    if (id && !columnOf.has(id)) columnOf.set(id, index);
    else if (header) ignoredColumns.push(header);
  });

  const missing = (['location', 'dateTime'] as const).filter((id) => !columnOf.has(id));
  if (missing.length > 0) {
    return {
      error: `Missing required ${missing.length === 1 ? 'column' : 'columns'} ${missing
        .map((id) => `"${SHOPPING_COLUMNS[id]}"`)
        .join(' and ')}. This doesn't look like a Shopping Calculator file; start from the import template.`,
    };
  }
  if (dataRows.length === 0) {
    return { error: 'The file has column names but no shopping under them.' };
  }

  const cellOf = (cells: string[], id: ColumnId) => {
    const column = columnOf.get(id);
    return column === undefined ? '' : (cells[column] ?? '').trim();
  };

  // Rows grouped into sessions, in the order sessions first appear: by the
  // "Session" number, or by location and date and time when there's none.
  const groups = new Map<string, { line: number; cells: string[] }[]>();
  dataRows.forEach((cells, index) => {
    const session = cellOf(cells, 'session');
    const key = session
      ? `#${session}`
      : `@${productKey(cellOf(cells, 'location'))}\u0001${cellOf(cells, 'dateTime')}`;
    const rows = groups.get(key) ?? [];
    rows.push({ line: index + 2, cells });
    groups.set(key, rows);
  });

  const seen = new Map<string, 'existing' | number>();
  for (const record of existing) seen.set(duplicateKey(record), 'existing');

  const sessions = [...groups.values()].map((rows): ImportSession => {
    const [first] = rows;
    const errors: string[] = [];
    let fixable = true;
    const rowError = (line: number, message: string) =>
      errors.push(rows.length > 1 ? `Row ${line}: ${message}` : message);

    // The session's details come from its first row.
    const location = cellOf(first.cells, 'location');
    if (!location) {
      rowError(first.line, 'Location is required.');
      fixable = false;
    }

    const dateText = cellOf(first.cells, 'dateTime');
    const date = dateText ? parseDateTimeText(dateText) : null;
    if (!date) {
      rowError(
        first.line,
        dateText
          ? `Date and time must be like ${formatSortableDateTime(nowInPHT())}.`
          : 'Date and time is required.'
      );
      fixable = false;
    }

    let budgetCentavos: number | null = null;
    const budgetText = cellOf(first.cells, 'budget');
    if (budgetText) {
      const parsed = parseMoneyInput(budgetText);
      if (!parsed.ok) rowError(first.line, moneyErrorMessage('Budget', parsed.error));
      else if (parsed.centavos === 0) rowError(first.line, 'Budget must be more than ₱0.00, or blank for no budget.');
      else budgetCentavos = parsed.centavos;
    }

    let createdAt: string | null = null;
    const addedText = cellOf(first.cells, 'added');
    if (addedText) {
      const added = parseDateTimeText(addedText);
      if (added) createdAt = added.toISOString();
      else rowError(first.line, `Added must be like ${formatSortableDateTime(nowInPHT())}.`);
    }

    // Items in "Item #" order when the file has it (e.g. after sorting the
    // spreadsheet by another column), otherwise in the file's order.
    const position = (cells: string[]) => {
      const number = Number(cellOf(cells, 'position'));
      return cellOf(cells, 'position') && Number.isFinite(number) ? number : Infinity;
    };
    const itemRows = [...rows].sort((a, b) => {
      const difference = position(a.cells) - position(b.cells);
      return Number.isNaN(difference) ? 0 : difference;
    });

    const items: ImportItem[] = [];
    let skippedItems = 0;
    for (const { line, cells } of itemRows) {
      const name = cellOf(cells, 'item');
      const priceText = cellOf(cells, 'price');
      const quantityText = cellOf(cells, 'quantity');
      const inCartText = cellOf(cells, 'inCart');
      // A row without item details is the session on its own (one with no items).
      if (!name && !priceText && !quantityText && !inCartText) continue;

      const itemErrors: string[] = [];
      if (!name) itemErrors.push('Item name is required.');
      const price = parseMoneyInput(priceText);
      if (!price.ok) itemErrors.push(moneyErrorMessage('Price', price.error));
      // Blank means 1, as a new item starts out.
      const quantity = quantityText ? Number(quantityText.replace(/,/g, '')) : 1;
      if (!Number.isInteger(quantity) || quantity < 0) {
        itemErrors.push('Quantity must be a whole number, 0 or more.');
      }
      const inCart = inCartText.toLowerCase();
      if (!YES.includes(inCart) && !NO.includes(inCart)) {
        itemErrors.push('In cart must be Yes or No.');
      }

      if (itemErrors.length > 0 || !price.ok) {
        skippedItems++;
        for (const message of itemErrors) rowError(line, message);
        continue;
      }
      items.push({
        name,
        priceCentavos: price.centavos,
        quantity,
        inCart: YES.includes(inCart),
      });
    }

    const dateTime = date ? date.toISOString() : null;
    let duplicateOf: ImportSession['duplicateOf'] = null;
    if (location && dateTime) {
      const key = duplicateKey({ location, dateTime, items });
      duplicateOf = seen.get(key) ?? null;
      if (duplicateOf === null) seen.set(key, first.line);
    }

    return {
      line: first.line,
      location,
      dateTime,
      budgetCentavos,
      createdAt,
      items,
      skippedItems,
      errors,
      fixable: fixable && errors.length > 0,
      duplicateOf,
    };
  });

  return { preview: { fileName: file.name, sessions, ignoredColumns } };
}

/** Whether a session gets imported with these options. */
export function willImport(session: ImportSession, options: ImportOptions): boolean {
  if (session.errors.length > 0 && !(session.fixable && options.fixInvalid)) return false;
  if (session.duplicateOf !== null && !options.includeDuplicates) return false;
  return true;
}

export function summarizeImport(preview: ImportPreview, options: ImportOptions): ImportSummary {
  const { sessions } = preview;
  const importing = sessions.filter((session) => willImport(session, options));
  return {
    ready: sessions.filter((session) => session.errors.length === 0 && session.duplicateOf === null)
      .length,
    invalid: sessions.filter((session) => session.errors.length > 0).length,
    fixable: sessions.filter((session) => session.fixable).length,
    duplicates: sessions.filter((session) => session.duplicateOf !== null).length,
    toImport: importing.length,
    itemsToImport: importing.reduce((sum, session) => sum + session.items.length, 0),
  };
}

/** The sessions to add: the ones that get imported with these options. */
export function importInputs(preview: ImportPreview, options: ImportOptions): ShoppingImportInput[] {
  return preview.sessions
    .filter((session) => session.dateTime && willImport(session, options))
    .map((session) => ({
      location: session.location,
      dateTime: session.dateTime!,
      budgetCentavos: session.budgetCentavos,
      createdAt: session.createdAt,
      items: session.items,
    }));
}

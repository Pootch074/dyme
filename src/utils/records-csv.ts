import {
  getRecordCategory,
  RECORD_CATEGORIES,
  type RecordCategory,
  type RecordCategoryId,
  type RecordField,
} from '@/constants/record-categories';
import type { RecordEntry } from '@/hooks/use-records';
import type { ExportFile } from '@/utils/data-export';
import {
  formatSortableDateTime,
  nowInPHT,
  parseDateText,
  parseDateTimeText,
  toDateOnlyString,
} from '@/utils/date';
import { maskValue } from '@/utils/record-format';
import { validateEntryValues } from '@/utils/record-validation';
import { buildCsv, parseCsv, type Sheet } from '@/utils/spreadsheet';

/** Every category, typed loosely so any of them fits a `RecordCategory`. */
const CATEGORIES: readonly RecordCategory[] = RECORD_CATEGORIES;

/*
 * The Records CSV layout, shared by export, the import template and import so
 * an exported file can be imported back as is: one file for every category.
 * A "Category" column names each entry's category, then one column per field
 * label across all categories (amounts as "Cost (PHP)"; a label shared by
 * several categories, like "Notes", is one column), then "Added". Each row
 * fills in only its own category's columns. Dates are YYYY-MM-DD and
 * date-times "YYYY-MM-DD HH:mm" (device time).
 */

/** Column naming each entry's category (by label; its id is accepted too). */
export const CATEGORY_COLUMN = 'Category';

/** Column for when the entry was added; blank on import means "now". */
export const ADDED_COLUMN = 'Added';

/** A field's column header, e.g. "Cost (PHP)" for an amount. */
export function recordColumn(field: RecordField): string {
  return field.type === 'amount' ? `${field.label} (PHP)` : field.label;
}

/** A header or label compared loosely: case, spacing and a "(PHP)" suffix don't matter. */
function normalizeHeader(text: string): string {
  return text
    .toLowerCase()
    .replace(/\(php\)$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every column of the file: "Category", each distinct field column in category order, "Added". */
export function recordsColumns(): string[] {
  const seen = new Set<string>();
  const columns = [CATEGORY_COLUMN];
  for (const category of CATEGORIES) {
    for (const field of category.fields) {
      const column = recordColumn(field);
      if (seen.has(normalizeHeader(column))) continue;
      seen.add(normalizeHeader(column));
      columns.push(column);
    }
  }
  return [...columns, ADDED_COLUMN];
}

/** Short name for file names, e.g. "bank-finance". */
export function recordSlug(category: RecordCategory): string {
  return category.label
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function dateTimeCell(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : formatSortableDateTime(date);
}

function recordCell(field: RecordField, value: string, includeSensitive: boolean): string | number {
  if (!value) return '';
  if (field.sensitive && !includeSensitive) return maskValue(field, value);
  if (field.type === 'datetime') return dateTimeCell(value);
  if (field.type === 'amount' || field.type === 'number') {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
  return value;
}

/** Rows in the file's layout, each with its category, its field values and when it was added. */
function recordRows(
  rows: readonly { category: RecordCategory; cells: (field: RecordField) => string | number; added: string }[]
): Sheet {
  const columns = recordsColumns();
  const indexOf = new Map(columns.map((column, index) => [normalizeHeader(column), index]));
  return {
    name: 'Records',
    columns,
    rows: rows.map(({ category, cells, added }) => {
      const row: (string | number)[] = columns.map(() => '');
      row[0] = category.label;
      for (const field of category.fields) {
        row[indexOf.get(normalizeHeader(recordColumn(field)))!] = cells(field);
      }
      row[columns.length - 1] = added;
      return row;
    }),
  };
}

/**
 * Every entry, of every category, as one table: grouped by category (in the
 * app's category order), oldest first within each. Passwords and card/account
 * numbers are masked (•••• 7890) unless `includeSensitive` is on.
 */
export function recordsSheet(entries: readonly RecordEntry[], includeSensitive: boolean): Sheet {
  const position = new Map<string, number>(CATEGORIES.map((category, index) => [category.id, index]));
  return recordRows(
    entries
      .filter((entry) => position.has(entry.category))
      .sort(
        (a, b) =>
          position.get(a.category)! - position.get(b.category)! ||
          a.createdAt.localeCompare(b.createdAt)
      )
      .map((entry) => ({
        category: getRecordCategory(entry.category)!,
        cells: (field) => recordCell(field, entry.values[field.key] ?? '', includeSensitive),
        added: dateTimeCell(entry.createdAt),
      }))
  );
}

function csvFile(fileName: string, sheet: Sheet): ExportFile {
  return {
    fileName,
    mimeType: 'text/csv',
    uti: 'public.comma-separated-values-text',
    data: buildCsv(sheet),
  };
}

/** Every entry, of every category, as one CSV file that Import reads back. */
export function buildRecordsCsvFile(
  entries: readonly RecordEntry[],
  includeSensitive: boolean
): ExportFile {
  const date = toDateOnlyString(nowInPHT());
  return csvFile(`dyme-records-${date}.csv`, recordsSheet(entries, includeSensitive));
}

/** An example value for the template row, by field type. */
function exampleValue(category: RecordCategory, field: RecordField): string {
  const lastWeek = new Date(nowInPHT().getTime() - 7 * 24 * 60 * 60 * 1000);
  if (field.key === category.titleField) return `Sample ${category.label.toLowerCase()} entry`;
  if (field.sensitive === 'all') return '';
  if (field.format === 'digits') return '1234567890';
  if (field.format === 'email') return 'name@example.com';
  if (field.format === 'phone') return '09171234567';
  if (field.format === 'username') return 'username';
  switch (field.type) {
    case 'amount':
      return '1500.00';
    case 'number':
      return /year/i.test(field.label)
        ? String(lastWeek.getFullYear())
        : (field.defaultValue ?? String(Math.max(field.min ?? 1, 1)));
    case 'date':
      return toDateOnlyString(lastWeek);
    case 'datetime':
      return `${toDateOnlyString(lastWeek)} 09:30`;
    case 'choice':
    case 'select':
      return field.options?.[0] ?? '';
    case 'multiline':
      return 'Optional notes';
    default:
      return `Sample ${field.label.toLowerCase()}`;
  }
}

/** The import template: every column, and one example row per category to replace or delete. */
export function buildRecordsTemplateFile(): ExportFile {
  return csvFile(
    'dyme-records-template.csv',
    recordRows(
      CATEGORIES.map((category) => ({
        category,
        cells: (field) => exampleValue(category, field),
        added: '',
      }))
    )
  );
}

// ---------------------------------------------------------------------------
// Import

/** One data row of the file, checked and converted to how entries store values. */
export type ImportRow = {
  /** Line in the file (the header is line 1). */
  line: number;
  /** The row's category, or null when it names none (the row is skipped). */
  category: RecordCategory | null;
  title: string;
  /** Stored-format values; any field with an error is left blank here. */
  values: Record<string, string>;
  /** When it was added (ISO), or null to use the import time. */
  createdAt: string | null;
  errors: string[];
  /** Every error is in an optional value, so blanking those values makes the row valid. */
  fixable: boolean;
  /** Matches an entry already in the app, or an earlier line of the file. */
  duplicateOf: 'existing' | number | null;
};

export type ImportPreview = {
  fileName: string;
  rows: ImportRow[];
  /** The categories rows are for, in the app's order, with how many rows each. */
  categories: { category: RecordCategory; rows: number }[];
  /** Headers that aren't a column of any category. */
  ignoredColumns: string[];
  /** Optional columns the file doesn't have; those values are left blank. */
  missingColumns: string[];
};

export type ImportOptions = {
  /** Import rows with invalid optional values, leaving those values blank. */
  fixInvalid: boolean;
  /** Import rows that duplicate existing entries (or earlier rows) too. */
  includeDuplicates: boolean;
};

export type ImportSummary = {
  ready: number;
  invalid: number;
  fixable: number;
  duplicates: number;
  toImport: number;
};

const CSV_MIME_TYPES = ['text/csv', 'text/comma-separated-values', 'application/csv'];

/** One cell as a stored value, or why it can't be. */
function parseCell(field: RecordField, raw: string): { value: string } | { error: string } {
  const text = raw.trim();
  if (!text) return { value: '' };

  if (field.sensitive && text.includes('•')) {
    return {
      error: `${field.label} is masked (••••). Export again with passwords and card numbers included, or leave it blank.`,
    };
  }

  switch (field.type) {
    case 'amount': {
      const amount = Number(text.replace(/₱|php|,|\s/gi, ''));
      return Number.isFinite(amount) && amount >= 0
        ? { value: String(amount) }
        : { error: `${field.label} must be an amount, like 1500.00.` };
    }
    case 'number':
      return { value: text.replace(/,/g, '') };
    case 'date': {
      const date = parseDateText(text);
      return date
        ? { value: toDateOnlyString(date) }
        : { error: `${field.label} must be a date, like ${toDateOnlyString(nowInPHT())}.` };
    }
    case 'datetime': {
      const date = parseDateTimeText(text);
      return date
        ? { value: date.toISOString() }
        : {
            error: `${field.label} must be a date and time, like ${toDateOnlyString(nowInPHT())} 3:45 PM.`,
          };
    }
    case 'choice':
    case 'select': {
      const option = field.options?.find((candidate) => candidate.toLowerCase() === text.toLowerCase());
      if (option) return { value: option };
      // A select also takes any typed-in value ("Other…").
      return field.type === 'select'
        ? { value: text }
        : { error: `${field.label} must be one of: ${field.options?.join(', ')}.` };
    }
    default:
      return { value: text };
  }
}

/**
 * What identifies an entry for spotting duplicates: its values in `fields`
 * (the file's columns, minus sensitive ones, which a default export masks),
 * compared loosely, with date-times to the minute (as exported).
 */
function duplicateKey(fields: readonly RecordField[], values: Record<string, string>): string {
  return fields
    .map((field) => {
      const value = (values[field.key] ?? '').trim();
      if (field.type === 'datetime' && value) return dateTimeCell(value);
      if ((field.type === 'amount' || field.type === 'number') && value) return String(Number(value));
      return value.toLowerCase();
    })
    .join('\u0001');
}

/** The category a "Category" cell names: its label, id or file-name slug, loosely. */
function findCategory(text: string): RecordCategory | null {
  const wanted = normalizeHeader(text);
  if (!wanted) return null;
  return (
    CATEGORIES.find(
      (category) =>
        normalizeHeader(category.label) === wanted ||
        category.id === wanted ||
        recordSlug(category) === wanted
    ) ?? null
  );
}

/**
 * Which category a file without a "Category" column is for (one saved by an
 * older version, one category per file): its exported file name first, then
 * the best-matching headers.
 */
function detectSingleCategory(fileName: string, headers: string[]): RecordCategory | null {
  const name = fileName.toLowerCase();
  const named = [...CATEGORIES]
    .sort((a, b) => recordSlug(b).length - recordSlug(a).length)
    .find((category) => name.includes(`dyme-${recordSlug(category)}-`));
  if (named) return named;

  const normalized = new Set(headers.map(normalizeHeader));
  let best: { category: RecordCategory; score: number } | null = null;
  for (const category of CATEGORIES) {
    const labels = category.fields.map((field) => normalizeHeader(field.label));
    const matched = labels.filter((label) => normalized.has(label)).length;
    if (matched === 0) continue;
    // Most columns matched; on a tie, the category with the fewest columns missing.
    const score = matched - (labels.length - matched) / 100;
    if (!best || score > best.score) best = { category, score };
  }
  return best?.category ?? null;
}

/**
 * Where each of a category's fields is in the file: the column with its label
 * or, failing that, its key. Fields without a column are left out.
 */
function fieldColumns(category: RecordCategory, normalizedHeaders: string[]): Map<string, number> {
  const columns = new Map<string, number>();
  for (const field of category.fields) {
    let index = normalizedHeaders.indexOf(normalizeHeader(field.label));
    if (index === -1) index = normalizedHeaders.indexOf(field.key.toLowerCase());
    if (index !== -1) columns.set(field.key, index);
  }
  return columns;
}

function titleFieldOf(category: RecordCategory): RecordField {
  return category.fields.find((field) => field.key === category.titleField)!;
}

/**
 * Reads and checks an import file holding records of any categories. Returns
 * a problem with the file as a whole (not a CSV, no header, required column
 * missing, …), or a preview of every row with its errors and duplicates, for
 * the user to confirm.
 */
export function prepareRecordImport(
  file: { name: string; mimeType?: string | null; text: string },
  existing: readonly RecordEntry[]
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

  const headers = headerRow.map((header) => header.trim());
  const normalized = headers.map(normalizeHeader);
  const categoryColumn = normalized.indexOf(normalizeHeader(CATEGORY_COLUMN));
  const addedColumn = normalized.indexOf(normalizeHeader(ADDED_COLUMN));

  // Without a "Category" column, every row is for the one category the file is for.
  const singleCategory = categoryColumn === -1 ? detectSingleCategory(file.name, headers) : null;
  if (categoryColumn === -1 && !singleCategory) {
    return {
      error: `The file needs a "${CATEGORY_COLUMN}" column naming each record's category. The first row must hold the column names, as in the import template.`,
    };
  }
  if (dataRows.length === 0) {
    return { error: 'The file has column names but no records under them.' };
  }

  const rowCategories = dataRows.map(
    (cells) => singleCategory ?? findCategory(cells[categoryColumn] ?? '')
  );
  const present = CATEGORIES.filter((category) => rowCategories.includes(category));

  const columnsOf = new Map<string, Map<string, number>>(
    CATEGORIES.map((category) => [category.id, fieldColumns(category, normalized)])
  );

  for (const category of present) {
    const titleField = titleFieldOf(category);
    if (!columnsOf.get(category.id)!.has(titleField.key)) {
      return {
        error: `Missing required column "${titleField.label}" for ${category.label}. Add it, or start from the import template.`,
      };
    }
  }

  // A column no category reads (nor "Category" or "Added") is ignored.
  const used = new Set<number>([categoryColumn, addedColumn]);
  for (const columns of columnsOf.values()) {
    for (const index of columns.values()) used.add(index);
  }
  const ignoredColumns = headers.filter((header, index) => header && !used.has(index));

  const missingColumns = [
    ...new Set(
      present.flatMap((category) =>
        category.fields
          .filter((field) => !columnsOf.get(category.id)!.has(field.key))
          .map(recordColumn)
      )
    ),
  ];

  // Per category, the columns compared for duplicates: in the file, and not sensitive
  // (a default export masks those).
  const comparedOf = new Map<string, RecordField[]>(
    CATEGORIES.map((category) => [
      category.id,
      category.fields.filter(
        (field) => columnsOf.get(category.id)!.has(field.key) && !field.sensitive
      ),
    ])
  );
  const keyOf = (category: RecordCategory, values: Record<string, string>) =>
    `${category.id}\u0002${duplicateKey(comparedOf.get(category.id)!, values)}`;
  const seen = new Map<string, 'existing' | number>();
  for (const entry of existing) {
    const category = getRecordCategory(entry.category);
    if (category && present.includes(category)) seen.set(keyOf(category, entry.values), 'existing');
  }

  const rows = dataRows.map((cells, index): ImportRow => {
    const line = index + 2;
    const category = rowCategories[index];
    if (!category) {
      const named = (cells[categoryColumn] ?? '').trim();
      return {
        line,
        category: null,
        title: named,
        values: {},
        createdAt: null,
        errors: [
          named
            ? `"${named}" isn't a Records category.`
            : `${CATEGORY_COLUMN} is blank. Name one of the Records categories.`,
        ],
        fixable: false,
        duplicateOf: null,
      };
    }

    const columnOf = columnsOf.get(category.id)!;
    const titleField = titleFieldOf(category);
    const values: Record<string, string> = {};
    const errors: string[] = [];
    let fixable = true;

    for (const field of category.fields) {
      const column = columnOf.get(field.key);
      const parsed = parseCell(field, column === undefined ? '' : (cells[column] ?? ''));
      if ('error' in parsed) {
        errors.push(parsed.error);
        values[field.key] = '';
      } else {
        values[field.key] = parsed.value;
      }
    }

    // The same rules as the Add Entry form (required title, whole numbers, no future dates…).
    const checked = validateEntryValues(category, values);
    if ('errors' in checked) {
      for (const [key, message] of Object.entries(checked.errors)) {
        errors.push(message);
        values[key] = '';
        if (key === titleField.key) fixable = false;
      }
    } else {
      Object.assign(values, checked.values);
    }

    const addedText = addedColumn === -1 ? '' : (cells[addedColumn] ?? '').trim();
    let createdAt: string | null = null;
    if (addedText) {
      const added = parseDateTimeText(addedText);
      if (added) createdAt = added.toISOString();
      else errors.push(`${ADDED_COLUMN} must be a date and time, like ${formatSortableDateTime(nowInPHT())}.`);
    }

    const key = keyOf(category, values);
    const duplicateOf = values[titleField.key] ? (seen.get(key) ?? null) : null;
    if (duplicateOf === null && values[titleField.key]) seen.set(key, line);

    return {
      line,
      category,
      title: values[titleField.key] || (cells[columnOf.get(titleField.key)!] ?? '').trim(),
      values,
      createdAt,
      errors,
      fixable: fixable && errors.length > 0,
      duplicateOf,
    };
  });

  const categories = present.map((category) => ({
    category,
    rows: rows.filter((row) => row.category === category).length,
  }));

  return { preview: { fileName: file.name, rows, categories, ignoredColumns, missingColumns } };
}

/** The entries to add: the rows that get imported with these options. */
export function importInputs(
  preview: ImportPreview,
  options: ImportOptions
): { category: RecordCategoryId; values: Record<string, string>; createdAt: string | null }[] {
  return preview.rows
    .filter((row) => row.category && willImport(row, options))
    .map((row) => ({
      category: row.category!.id as RecordCategoryId,
      values: row.values,
      createdAt: row.createdAt,
    }));
}

/** Whether a row gets imported with these options. */
export function willImport(row: ImportRow, options: ImportOptions): boolean {
  if (row.errors.length > 0 && !(row.fixable && options.fixInvalid)) return false;
  if (row.duplicateOf !== null && !options.includeDuplicates) return false;
  return true;
}

export function summarizeImport(preview: ImportPreview, options: ImportOptions): ImportSummary {
  const { rows } = preview;
  return {
    ready: rows.filter((row) => row.errors.length === 0 && row.duplicateOf === null).length,
    invalid: rows.filter((row) => row.errors.length > 0).length,
    fixable: rows.filter((row) => row.fixable).length,
    duplicates: rows.filter((row) => row.duplicateOf !== null).length,
    toImport: rows.filter((row) => willImport(row, options)).length,
  };
}

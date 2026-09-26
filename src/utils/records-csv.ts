import {
  RECORD_CATEGORIES,
  type RecordCategory,
  type RecordField,
} from '@/constants/record-categories';
import type { RecordEntry } from '@/hooks/use-records';
import type { ExportFile } from '@/utils/data-export';
import { formatSortableDateTime, nowInPHT, toDateOnlyString } from '@/utils/date';
import { maskValue } from '@/utils/record-format';
import { validateEntryValues } from '@/utils/record-validation';
import { buildCsv, parseCsv, type Sheet } from '@/utils/spreadsheet';

/*
 * The Records CSV layout, shared by export, the import template and import so
 * an exported file can be imported back as is: one file per category, a
 * header row of the category's field labels (amounts as "Cost (PHP)") plus
 * "Added", then one row per entry. Dates are YYYY-MM-DD and date-times
 * "YYYY-MM-DD HH:mm" (device time).
 */

/** Column for when the entry was added; blank on import means "now". */
export const ADDED_COLUMN = 'Added';

/** A field's column header, e.g. "Cost (PHP)" for an amount. */
export function recordColumn(field: RecordField): string {
  return field.type === 'amount' ? `${field.label} (PHP)` : field.label;
}

export function recordColumns(category: RecordCategory): string[] {
  return [...category.fields.map(recordColumn), ADDED_COLUMN];
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

/**
 * A category's entries as a table, oldest first. Passwords and card/account
 * numbers are masked (•••• 7890) unless `includeSensitive` is on.
 */
export function recordSheet(
  category: RecordCategory,
  entries: readonly RecordEntry[],
  includeSensitive: boolean
): Sheet {
  const rows = entries
    .filter((entry) => entry.category === category.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((entry) => [
      ...category.fields.map((field) =>
        recordCell(field, entry.values[field.key] ?? '', includeSensitive)
      ),
      dateTimeCell(entry.createdAt),
    ]);
  return { name: `Records - ${category.label}`, columns: recordColumns(category), rows };
}

function csvFile(fileName: string, sheet: Sheet): ExportFile {
  return {
    fileName,
    mimeType: 'text/csv',
    uti: 'public.comma-separated-values-text',
    data: buildCsv(sheet),
  };
}

/** A category's entries as a CSV file that Import reads back. */
export function buildRecordsCsvFile(
  category: RecordCategory,
  entries: readonly RecordEntry[],
  includeSensitive: boolean
): ExportFile {
  const date = toDateOnlyString(nowInPHT());
  return csvFile(
    `dyme-${recordSlug(category)}-${date}.csv`,
    recordSheet(category, entries, includeSensitive)
  );
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

/** The import template: the category's column headers and one example row to replace. */
export function buildRecordTemplateFile(category: RecordCategory): ExportFile {
  return csvFile(`dyme-${recordSlug(category)}-template.csv`, {
    name: category.label,
    columns: recordColumns(category),
    rows: [[...category.fields.map((field) => exampleValue(category, field)), '']],
  });
}

// ---------------------------------------------------------------------------
// Import

/** One data row of the file, checked and converted to how entries store values. */
export type ImportRow = {
  /** Line in the file (the header is line 1). */
  line: number;
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
  category: RecordCategory;
  rows: ImportRow[];
  /** Headers that aren't a column of the category. */
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

/** A header or label compared loosely: case, spacing and a "(PHP)" suffix don't matter. */
function normalizeHeader(text: string): string {
  return text
    .toLowerCase()
    .replace(/\(php\)$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function validDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

/** Reads 2026-09-26, 9/26/2026 (month first, as Excel saves it) or Sep 26, 2026. */
function parseDateText(text: string): Date | null {
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return validDate(Number(match[1]), Number(match[2]), Number(match[3]));
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return validDate(Number(match[3]), Number(match[1]), Number(match[2]));
  match = text.match(/^([A-Za-z]{3,})\.? (\d{1,2}),? (\d{4})$/);
  if (match) {
    const month = MONTHS.indexOf(match[1].slice(0, 3).toLowerCase());
    if (month !== -1) return validDate(Number(match[3]), month + 1, Number(match[2]));
  }
  return null;
}

/** Reads a date, optionally followed by a 24-hour or AM/PM time, e.g. "2026-09-26 3:45 PM". */
function parseDateTimeText(text: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const time = text.match(/[\sT,]+(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?\.?m?\.?$/i);
  const date = parseDateText(time ? text.slice(0, time.index).trim() : text);
  if (!date) return null;
  if (!time) return date;

  let hours = Number(time[1]);
  const minutes = Number(time[2]);
  const period = time[3]?.toLowerCase();
  if (minutes > 59) return null;
  if (period) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (period === 'p' ? 12 : 0);
  } else if (hours > 23) {
    return null;
  }
  date.setHours(hours, minutes, 0, 0);
  return date;
}

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

/** Which category a file is for: its exported file name first, then the best-matching headers. */
function detectCategory(fileName: string, headers: string[]): RecordCategory | null {
  const name = fileName.toLowerCase();
  const named = [...RECORD_CATEGORIES]
    .sort((a, b) => recordSlug(b).length - recordSlug(a).length)
    .find((category) => name.includes(`dyme-${recordSlug(category)}-`));
  if (named) return named;

  const normalized = new Set(headers.map(normalizeHeader));
  let best: { category: RecordCategory; score: number } | null = null;
  for (const category of RECORD_CATEGORIES) {
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
 * Reads and checks an import file. Returns a problem with the file as a whole
 * (not a CSV, no header, required column missing, …), or a preview of every
 * row with its errors and duplicates, for the user to confirm.
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
  const category = detectCategory(file.name, headers);
  if (!category) {
    return {
      error:
        "The columns don't match any Records category. The first row must hold the column names, as in the import template.",
    };
  }

  // Where each field's (and "Added") values are, by header; later repeats are ignored.
  const columnOf = new Map<string, number>();
  const ignoredColumns: string[] = [];
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const field = category.fields.find(
      (candidate) =>
        normalizeHeader(candidate.label) === normalized || candidate.key.toLowerCase() === normalized
    );
    const key = field ? field.key : normalized === normalizeHeader(ADDED_COLUMN) ? ADDED_COLUMN : null;
    if (key && !columnOf.has(key)) columnOf.set(key, index);
    else if (header) ignoredColumns.push(header);
  });

  const titleField = category.fields.find((field) => field.key === category.titleField)!;
  if (!columnOf.has(titleField.key)) {
    return {
      error: `Missing required column "${titleField.label}" for ${category.label}. Add it, or start from the import template.`,
    };
  }
  if (dataRows.length === 0) {
    return { error: 'The file has column names but no records under them.' };
  }

  const missingColumns = category.fields
    .filter((field) => !columnOf.has(field.key))
    .map((field) => field.label);

  const compared = category.fields.filter((field) => columnOf.has(field.key) && !field.sensitive);
  const seen = new Map<string, 'existing' | number>();
  for (const entry of existing) {
    if (entry.category === category.id) seen.set(duplicateKey(compared, entry.values), 'existing');
  }

  const rows = dataRows.map((cells, index): ImportRow => {
    const line = index + 2;
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

    const addedColumn = columnOf.get(ADDED_COLUMN);
    const addedText = addedColumn === undefined ? '' : (cells[addedColumn] ?? '').trim();
    let createdAt: string | null = null;
    if (addedText) {
      const added = parseDateTimeText(addedText);
      if (added) createdAt = added.toISOString();
      else errors.push(`${ADDED_COLUMN} must be a date and time, like ${formatSortableDateTime(nowInPHT())}.`);
    }

    const key = duplicateKey(compared, values);
    const duplicateOf = values[titleField.key] ? (seen.get(key) ?? null) : null;
    if (duplicateOf === null && values[titleField.key]) seen.set(key, line);

    return {
      line,
      title: values[titleField.key] || (cells[columnOf.get(titleField.key)!] ?? '').trim(),
      values,
      createdAt,
      errors,
      fixable: fixable && errors.length > 0,
      duplicateOf,
    };
  });

  return { preview: { fileName: file.name, category, rows, ignoredColumns, missingColumns } };
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

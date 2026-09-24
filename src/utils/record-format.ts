import type { RecordCategory, RecordField } from '@/constants/record-categories';
import type { RecordEntry } from '@/hooks/use-records';
import { formatDisplayDate, formatRelativeTime, formatTimeOnly, parseDateOnly } from '@/utils/date';
import { formatPeso } from '@/utils/money';

/** The Date a date/datetime field's stored value refers to, or null when empty or not a date field. */
export function fieldDate(field: RecordField, value: string): Date | null {
  if (!value) return null;
  if (field.type === 'date') return parseDateOnly(value);
  if (field.type === 'datetime') return new Date(value);
  return null;
}

/**
 * The date an entry's timeline shows: its category's first filled-in timeline
 * field (e.g. purchase or received date), or else when it was added.
 */
export function entryTimelineDate(category: RecordCategory, entry: RecordEntry): Date {
  for (const key of category.timelineFields) {
    const field = category.fields.find((candidate) => candidate.key === key);
    const date = field ? fieldDate(field, entry.values[key] ?? '') : null;
    if (date && !Number.isNaN(date.getTime())) return date;
  }
  return new Date(entry.createdAt);
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * The timeline beside an entry's name, e.g. "Aug 15 2026". Built by hand
 * rather than from the device locale so every list reads the same way.
 */
export function formatTimelineDate(date: Date): string {
  return `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
}

const MASK = '••••';

/**
 * A sensitive value as shown before it's revealed: passwords become a fixed
 * run of dots (so their length doesn't show), numbers keep their last 4
 * characters, e.g. "•••• 4321".
 */
export function maskValue(field: RecordField, value: string): string {
  if (!value) return '—';
  const compact = value.replace(/[\s-]/g, '');
  if (field.sensitive === 'last4' && compact.length > 4) return `${MASK} ${compact.slice(-4)}`;
  return `${MASK}${MASK}`;
}

/** Renders a stored field value for the details view, e.g. "₱1,250.00" or "Jun 15, 2025". */
export function formatFieldValue(field: RecordField, value: string): string {
  if (!value) return '—';

  // Card and account numbers read more easily in groups of 4.
  if (field.format === 'digits' && /^\d+$/.test(value)) {
    return value.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  switch (field.type) {
    case 'amount': {
      const amount = Number(value);
      return Number.isFinite(amount) ? formatPeso(amount) : value;
    }
    case 'date':
      return formatDisplayDate(parseDateOnly(value));
    case 'datetime': {
      const date = new Date(value);
      return `${formatDisplayDate(date)}, ${formatTimeOnly(date)}`;
    }
    default:
      return value;
  }
}

export type EntryDetail = {
  label: string;
  value: string;
  /** For sensitive fields with a value: what to show until the eye toggle reveals `value`. */
  masked?: string;
};

/** Label / value rows for an entry's details view: every non-title field, plus "how long ago" and the added date. */
export function buildEntryDetails(category: RecordCategory, entry: RecordEntry): EntryDetail[] {
  const details: EntryDetail[] = [];
  for (const field of category.fields) {
    if (field.key === category.titleField) continue; // Shown as the title instead.
    const value = entry.values[field.key] ?? '';
    details.push({
      label: field.label,
      value: formatFieldValue(field, value),
      masked: field.sensitive && value ? maskValue(field, value) : undefined,
    });

    const date = fieldDate(field, value);
    if (field.relativeLabel && date) {
      details.push({ label: field.relativeLabel, value: formatRelativeTime(date) });
    }
  }
  details.push({ label: 'Added', value: formatDisplayDate(new Date(entry.createdAt)) });
  return details;
}

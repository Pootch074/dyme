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

/** Renders a stored field value for the details view, e.g. "₱1,250.00" or "Jun 15, 2025". */
export function formatFieldValue(field: RecordField, value: string): string {
  if (!value) return '—';

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

/** Label / value rows for an entry's details view: every non-title field, plus "how long ago" and the added date. */
export function buildEntryDetails(
  category: RecordCategory,
  entry: RecordEntry
): { label: string; value: string }[] {
  const details: { label: string; value: string }[] = [];
  for (const field of category.fields) {
    if (field.key === category.titleField) continue; // Shown as the title instead.
    const value = entry.values[field.key] ?? '';
    details.push({ label: field.label, value: formatFieldValue(field, value) });

    const date = fieldDate(field, value);
    if (field.relativeLabel && date) {
      details.push({ label: field.relativeLabel, value: formatRelativeTime(date) });
    }
  }
  details.push({ label: 'Added', value: formatDisplayDate(new Date(entry.createdAt)) });
  return details;
}

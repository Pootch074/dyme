import type { RecordField } from '@/constants/record-categories';
import { formatDisplayDate, formatTimeOnly, parseDateOnly } from '@/utils/date';

const pesoFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

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
      return Number.isFinite(amount) ? pesoFormatter.format(amount) : value;
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

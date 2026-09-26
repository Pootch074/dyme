import type { RecordCategory } from '@/constants/record-categories';
import { nowInPHT } from '@/utils/date';

/** Error messages keyed by field key. */
export type FieldErrors = Record<string, string>;

/** Trims text values and checks each field's rules; returns the cleaned values or per-field errors. */
export function validateEntryValues(
  category: RecordCategory,
  values: Record<string, string>
): { values: Record<string, string> } | { errors: FieldErrors } {
  const cleaned: Record<string, string> = {};
  const errors: FieldErrors = {};

  for (const field of category.fields) {
    const value = (values[field.key] ?? '').trim();
    cleaned[field.key] = value;

    if (!value) {
      if (field.required) errors[field.key] = `${field.label} is required.`;
      continue;
    }

    if (field.type === 'number') {
      const min = field.min ?? 0;
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < min) {
        errors[field.key] = `${field.label} must be a whole number of at least ${min}.`;
      }
    } else if (field.type === 'amount') {
      const parsed = Number(value.replace(/,/g, ''));
      if (!Number.isFinite(parsed) || parsed < 0) {
        errors[field.key] = `${field.label} must be a valid amount.`;
      } else {
        cleaned[field.key] = String(parsed);
      }
    } else if (field.type === 'datetime' && new Date(value).getTime() > nowInPHT().getTime()) {
      errors[field.key] = `${field.label} can't be in the future.`;
    }
  }

  return Object.keys(errors).length > 0 ? { errors } : { values: cleaned };
}

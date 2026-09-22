import { parseDateOnly } from './date';

import type { DtrEntry } from '@/hooks/use-dtr';

/** A full calendar month. */
export type DtrPeriod = {
  year: number;
  /** 0-indexed, matching Date#getMonth. */
  month: number;
};

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getPeriodForDate(date: Date): DtrPeriod {
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Number of days in the period's month (28–31). */
export function daysInPeriod(period: DtrPeriod): number {
  return new Date(period.year, period.month + 1, 0).getDate();
}

function periodSortKey(period: DtrPeriod): number {
  return period.year * 100 + period.month;
}

export function periodLabel(period: DtrPeriod): string {
  return `${MONTH_NAMES[period.month]} ${period.year}`;
}

/** Distinct months that have at least one entry, newest first. */
export function listPeriodsWithEntries(
  entries: DtrEntry[]
): (DtrPeriod & { entryCount: number })[] {
  const byKey = new Map<number, DtrPeriod & { entryCount: number }>();

  for (const entry of entries) {
    const period = getPeriodForDate(parseDateOnly(entry.date));
    const key = periodSortKey(period);
    const existing = byKey.get(key);
    if (existing) {
      existing.entryCount += 1;
    } else {
      byKey.set(key, { ...period, entryCount: 1 });
    }
  }

  return Array.from(byKey.values()).sort((a, b) => periodSortKey(b) - periodSortKey(a));
}

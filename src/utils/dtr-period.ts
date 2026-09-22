import { parseDateOnly } from './date';

import type { DtrEntry } from '@/hooks/use-dtr';

/** A half-month DTR cutoff: the 1st–15th, or the 16th–end of a given month. */
export type DtrPeriod = {
  year: number;
  /** 0-indexed, matching Date#getMonth. */
  month: number;
  startDay: number;
  endDay: number;
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
  const year = date.getFullYear();
  const month = date.getMonth();
  const startDay = date.getDate() <= 15 ? 1 : 16;
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const endDay = startDay === 1 ? 15 : lastDayOfMonth;
  return { year, month, startDay, endDay };
}

function periodSortKey(period: DtrPeriod): number {
  return period.year * 10000 + period.month * 100 + period.startDay;
}

export function periodLabel(period: DtrPeriod): string {
  return `${MONTH_NAMES[period.month]} ${period.startDay}–${period.endDay}, ${period.year}`;
}

export function isSamePeriod(a: DtrPeriod, b: DtrPeriod): boolean {
  return periodSortKey(a) === periodSortKey(b);
}

/** Distinct half-month periods that have at least one entry, newest first. */
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

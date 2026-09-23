import { formatCentavos } from '@/utils/money';

// Pure calculations and formatting for the Shopping Calculator. Totals are
// always derived from items here and never stored, so they can't drift.

export type ShoppingItem = {
  id: string;
  name: string;
  /** Unit price in centavos. */
  priceCentavos: number;
  /** Whole number, at least 1. */
  quantity: number;
};

export type ShoppingRecord = {
  id: string;
  location: string;
  /** When the shopping happened; ISO timestamp holding the PHT wall-clock time (see nowInPHT). */
  dateTime: string;
  /** Budget in centavos, or null when none is set. */
  budgetCentavos: number | null;
  items: ShoppingItem[];
  createdAt: string;
};

/** Item Total = Price × Quantity (centavos). */
export function itemTotal(item: Pick<ShoppingItem, 'priceCentavos' | 'quantity'>): number {
  return item.priceCentavos * item.quantity;
}

/** Total Expenses = sum of all Item Totals (centavos). */
export function recordTotal(record: Pick<ShoppingRecord, 'items'>): number {
  return record.items.reduce((sum, item) => sum + itemTotal(item), 0);
}

export type BudgetStatus =
  | { kind: 'none' }
  | { kind: 'under'; budget: number; left: number }
  | { kind: 'reached'; budget: number; left: 0 }
  | { kind: 'over'; budget: number; over: number };

/** Budget Left = Budget − Total Expenses, classified for the budget warning. */
export function budgetStatus(budgetCentavos: number | null, totalCentavos: number): BudgetStatus {
  if (budgetCentavos === null) return { kind: 'none' };
  const left = budgetCentavos - totalCentavos;
  if (left > 0) return { kind: 'under', budget: budgetCentavos, left };
  if (left === 0) return { kind: 'reached', budget: budgetCentavos, left: 0 };
  return { kind: 'over', budget: budgetCentavos, over: -left };
}

const MONTHS = [
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

const pad2 = (value: number) => String(value).padStart(2, '0');

/** e.g. "12:32 PM", "08:13 AM". */
export function formatShoppingTime(date: Date): string {
  const hours = date.getHours();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${pad2(hour12)}:${pad2(date.getMinutes())} ${hours >= 12 ? 'PM' : 'AM'}`;
}

/** e.g. "August 30, 2026"; without the year, "August 30". */
export function formatShoppingDate(date: Date, withYear = true): string {
  const monthDay = `${MONTHS[date.getMonth()]} ${pad2(date.getDate())}`;
  return withYear ? `${monthDay}, ${date.getFullYear()}` : monthDay;
}

/** e.g. "August 30, 2026 — 12:32 PM". */
export function formatShoppingDateTime(date: Date): string {
  return `${formatShoppingDate(date)} — ${formatShoppingTime(date)}`;
}

export type ShoppingMonthSection = {
  title: string;
  data: ShoppingRecord[];
};

/** Groups records under "August 2026"-style headings, newest month and newest record first. */
export function groupByMonth(records: ShoppingRecord[]): ShoppingMonthSection[] {
  const sorted = [...records].sort(
    (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
  );
  const sections: ShoppingMonthSection[] = [];

  for (const record of sorted) {
    const date = new Date(record.dateTime);
    const title = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    const last = sections[sections.length - 1];
    if (last?.title === title) last.data.push(record);
    else sections.push({ title, data: [record] });
  }

  return sections;
}

/** Warning text for a reached / exceeded budget, or null when there's nothing to warn about. */
export function budgetWarning(status: BudgetStatus): string | null {
  if (status.kind === 'reached') return "You've reached your budget.";
  if (status.kind === 'over') return `You're ${formatCentavos(status.over)} over budget.`;
  return null;
}

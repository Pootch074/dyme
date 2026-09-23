// Money is kept as whole centavos (integers) so sums and products never pick
// up floating-point error (0.1 + 0.2), and is only turned into pesos for display.

const pesoFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

/** Formats pesos, e.g. 1960 → "₱1,960.00". */
export function formatPeso(pesos: number): string {
  return pesoFormatter.format(pesos);
}

/** Formats centavos as pesos, e.g. 196000 → "₱1,960.00". */
export function formatCentavos(centavos: number): string {
  return pesoFormatter.format(centavos / 100);
}

/** Centavos as a plain editable amount, e.g. 18000 → "180.00". */
export function centavosToInput(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

export type MoneyParseResult =
  | { ok: true; centavos: number }
  | { ok: false; error: 'empty' | 'invalid' | 'negative' | 'precision' };

/**
 * Parses a user-typed peso amount ("1,250.50", "₱180", "99") into centavos.
 * Rejects blanks, non-numbers, negatives and more than two decimal places.
 */
export function parseMoneyInput(input: string): MoneyParseResult {
  const cleaned = input.replace(/[₱,\s]/g, '');
  if (!cleaned) return { ok: false, error: 'empty' };
  if (cleaned.startsWith('-')) return { ok: false, error: 'negative' };
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '.') return { ok: false, error: 'invalid' };

  const [whole, fraction = ''] = cleaned.split('.');
  if (fraction.length > 2) return { ok: false, error: 'precision' };

  const centavos = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(centavos) ? { ok: true, centavos } : { ok: false, error: 'invalid' };
}

/** Human message for a failed money parse, e.g. for "Price". */
export function moneyErrorMessage(label: string, error: Exclude<MoneyParseResult, { ok: true }>['error']): string {
  switch (error) {
    case 'empty':
      return `${label} is required.`;
    case 'negative':
      return `${label} can't be negative.`;
    case 'precision':
      return `${label} can have at most 2 decimal places.`;
    default:
      return `${label} must be a number.`;
  }
}

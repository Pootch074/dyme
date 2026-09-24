// Key handling for the Add Item number pad. Values are the raw typed strings
// ("1299.99", "3") that the item form already validates; formatting for
// display happens separately, so what's stored is always plain digits.

export type KeypadKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '.'
  | '.99'
  | 'erase'
  | 'clear';

/** Which field the number pad types into. The product name uses the regular keyboard. */
export type KeypadTarget = 'price' | 'quantity';

const MAX_PESO_DIGITS = 7; // up to ₱9,999,999.99
const MAX_QUANTITY_DIGITS = 4;

const isDigit = (key: KeypadKey) => key.length === 1 && key >= '0' && key <= '9';

/** Applies a key to a price like "250.5": digits, one decimal point with up to 2 places, and ".99". */
export function applyPriceKey(value: string, key: KeypadKey): string {
  if (key === 'clear') return '';
  if (key === 'erase') return value.slice(0, -1);

  const [whole, fraction] = value.split('.');
  const hasPoint = fraction !== undefined;

  if (key === '.99') return `${whole || '0'}.99`;
  if (key === '.') return hasPoint ? value : `${whole || '0'}.`;

  if (!isDigit(key)) return value;
  if (hasPoint) return fraction.length >= 2 ? value : value + key;
  if (whole === '0') return key; // "0" then "5" is "5", not "05"
  return whole.length >= MAX_PESO_DIGITS ? value : value + key;
}

/** Applies a key to a whole-number quantity; decimal keys don't apply. */
export function applyQuantityKey(value: string, key: KeypadKey): string {
  if (key === 'clear') return '';
  if (key === 'erase') return value.slice(0, -1);
  if (!isDigit(key)) return value;
  if (value === '0') return key;
  return value.length >= MAX_QUANTITY_DIGITS ? value : value + key;
}

export function applyKey(target: KeypadTarget, value: string, key: KeypadKey): string {
  return target === 'price' ? applyPriceKey(value, key) : applyQuantityKey(value, key);
}

/** Whether a key does anything for the target (decimal keys are off for quantity). */
export function isKeyEnabled(target: KeypadTarget, key: KeypadKey): boolean {
  return target === 'price' || (key !== '.' && key !== '.99');
}

/** Shows a typed price with thousands separators, e.g. "1299.9" → "1,299.9"; empty → "0.00". */
export function formatTypedPrice(value: string): string {
  if (!value) return '0.00';
  const [whole, fraction] = value.split('.');
  const grouped = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/** Keys for a physical keyboard (web / desktop), or null if unrelated. */
export function keyFromKeyboard(key: string): KeypadKey | null {
  if (key.length === 1 && key >= '0' && key <= '9') return key as KeypadKey;
  if (key === '.') return '.';
  if (key === 'Backspace') return 'erase';
  if (key === 'Delete' || key === 'Escape') return 'clear';
  return null;
}

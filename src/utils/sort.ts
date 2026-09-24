/**
 * A copy of `items` in A–Z order by their `label`, ignoring case and accents
 * (so "dtr" and "DTR" sort together).
 */
export function sortByLabel<T extends { label: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  );
}

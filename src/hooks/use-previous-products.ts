import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { useShopping } from '@/hooks/use-shopping';
import { filterProducts, previousProducts, productKey } from '@/utils/shopping';

/** Above this many products the picker shows a search field. */
const SEARCH_THRESHOLD = 6;

/**
 * State for the "Previously purchased" picker on a shopping record: the
 * products from the user's other sessions, a search, and which are ticked.
 * Adding the ticked ones creates new items (at their last price and quantity)
 * on this record; the price stays editable like any other item's.
 *
 * `openOnStart` (a just-created session) shows the picker once, as soon as
 * there's anything to pick, then clears the route's `new` flag so coming back
 * to the session doesn't show it again.
 */
export function usePreviousProducts(recordId: string, openOnStart = false) {
  const { records, isLoading, addItemsMerging } = useShopping();
  const record = records.find((candidate) => candidate.id === recordId) ?? null;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const products = useMemo(() => previousProducts(records, recordId), [records, recordId]);
  const visibleProducts = useMemo(() => filterProducts(products, query), [products, query]);
  const inListKeys = useMemo(
    () => new Set(record?.items.map((item) => productKey(item.name)) ?? []),
    [record]
  );

  const open = () => {
    setQuery('');
    setSelected(new Set());
    setIsOpen(true);
  };

  const hasProducts = products.length > 0;
  // Decided once, as soon as the records have loaded.
  const [startHandled, setStartHandled] = useState(!openOnStart);
  if (!startHandled && !isLoading) {
    setStartHandled(true);
    if (hasProducts) setIsOpen(true);
  }
  useEffect(() => {
    if (openOnStart && !isLoading) router.setParams({ new: undefined });
  }, [openOnStart, isLoading]);

  const close = () => setIsOpen(false);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /** Adds every ticked product to the record, in list order, then closes. */
  const addSelected = () => {
    if (!record) return;
    addItemsMerging(
      record.id,
      products
        .filter((product) => selected.has(product.key))
        .map((product) => ({
          name: product.name,
          priceCentavos: product.priceCentavos,
          quantity: product.quantity,
        }))
    );
    setIsOpen(false);
  };

  return {
    isOpen,
    open,
    close,
    hasProducts,
    showSearch: products.length > SEARCH_THRESHOLD,
    query,
    setQuery,
    products: visibleProducts,
    isSelected: (key: string) => selected.has(key),
    isInList: (key: string) => inListKeys.has(key),
    selectedCount: selected.size,
    toggle,
    addSelected,
    addLabel:
      selected.size === 0
        ? 'Add items'
        : `Add ${selected.size} ${selected.size === 1 ? 'item' : 'items'}`,
  };
}

export type PreviousProductsPicker = ReturnType<typeof usePreviousProducts>;

export const PREVIOUS_PRODUCTS_EMPTY =
  'No previously purchased products yet. Products you add to shopping sessions will appear here, ready to add again.';

export const PREVIOUS_PRODUCTS_HINT =
  'Items are added at the price you last paid. Edit an item if its price has changed.';

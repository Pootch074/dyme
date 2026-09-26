import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';

import { RECORD_CATEGORIES, type RecordCategoryId } from '@/constants/record-categories';
import type { RecordEntry } from '@/hooks/use-records';
import { createPersistentValue } from '@/utils/persistent-store';

/**
 * How the Records grid orders its categories: `custom` is the user's own
 * drag-and-drop order, `az` is alphabetical, and `modified` puts the category
 * whose entries changed most recently first.
 */
export type CategorySort = 'custom' | 'az' | 'modified';

/** The sort choices, in the order they're offered. */
export const CATEGORY_SORTS: readonly { value: CategorySort; label: string }[] = [
  { value: 'custom', label: 'Custom' },
  { value: 'az', label: 'A–Z' },
  { value: 'modified', label: 'Latest modified' },
];

type CategoryLayout = {
  sort: CategorySort;
  /** The custom order; categories missing from it follow in their default order. */
  order: RecordCategoryId[];
  /** Categories left off the grid. They keep their entries, still export, and open from a link. */
  hidden: RecordCategoryId[];
  /** When an entry in each category was last added, edited or removed (ISO timestamps). */
  modifiedAt: Partial<Record<RecordCategoryId, string>>;
};

const STORAGE_KEY = 'record-category-layout';

const DEFAULT_LAYOUT: CategoryLayout = { sort: 'custom', order: [], hidden: [], modifiedAt: {} };

const store = createPersistentValue<CategoryLayout>({
  storageKey: STORAGE_KEY,
  initial: DEFAULT_LAYOUT,
  load: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_LAYOUT, ...JSON.parse(raw) } : DEFAULT_LAYOUT;
  },
  label: 'record category layout',
});

/** Notes that `id`'s entries just changed, for the "Latest modified" sort (called by useRecords). */
export function markCategoryModified(id: RecordCategoryId) {
  const modifiedAt = new Date().toISOString();
  // Records can change before anything has shown the grid (and loaded this).
  store.ensureLoaded().then(() => {
    store.update((prev) => ({ ...prev, modifiedAt: { ...prev.modifiedAt, [id]: modifiedAt } }));
  });
}

function setSort(sort: CategorySort) {
  store.update((prev) => ({ ...prev, sort }));
}

function setCategoryVisible(id: RecordCategoryId, visible: boolean) {
  store.update((prev) => {
    const hidden = prev.hidden.filter((hiddenId) => hiddenId !== id);
    return { ...prev, hidden: visible ? hidden : [...hidden, id] };
  });
}

function showAllCategories() {
  store.update((prev) => ({ ...prev, hidden: [] }));
}

/** Every category in the custom order, with any not in it yet (e.g. newly added ones) after. */
function inCustomOrder(order: readonly string[]): (typeof RECORD_CATEGORIES)[number][] {
  const position = (id: string) => {
    const index = order.indexOf(id);
    return index === -1 ? order.length : index;
  };
  return [...RECORD_CATEGORIES].sort((a, b) => position(a.id) - position(b.id));
}

/**
 * The order, visibility and sorting of the Records grid's categories,
 * persisted in AsyncStorage. `entries` date the categories that haven't
 * changed since modification times started being kept.
 */
export function useCategoryLayout(entries: readonly RecordEntry[]) {
  const { value: layout, isLoading } = store.useValue();

  const counts = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const entry of entries) {
      byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + 1);
    }
    return byCategory;
  }, [entries]);

  const lastModified = useMemo(() => {
    const times = new Map<string, number>();
    const note = (id: string, iso: string | undefined) => {
      const time = iso ? Date.parse(iso) : NaN;
      if (!Number.isNaN(time) && time > (times.get(id) ?? 0)) times.set(id, time);
    };
    for (const entry of entries) note(entry.category, entry.createdAt);
    for (const [id, iso] of Object.entries(layout.modifiedAt)) note(id, iso);
    return times;
  }, [entries, layout.modifiedAt]);

  const categories = useMemo(() => {
    const custom = inCustomOrder(layout.order);
    if (layout.sort === 'az') {
      return custom.sort((a, b) => a.label.localeCompare(b.label));
    }
    if (layout.sort === 'modified') {
      // Stable, so never-changed categories keep their custom order at the end.
      return custom.sort((a, b) => (lastModified.get(b.id) ?? 0) - (lastModified.get(a.id) ?? 0));
    }
    return custom;
  }, [layout.order, layout.sort, lastModified]);

  const hidden = new Set<string>(layout.hidden);
  const visibleCategories = categories.filter((category) => !hidden.has(category.id));

  /** Drags a category to a new spot in `categories`; the result becomes the custom order. */
  const moveCategory = (fromIndex: number, toIndex: number) => {
    const ids = categories.map((category) => category.id);
    const [moved] = ids.splice(fromIndex, 1);
    if (!moved) return;
    ids.splice(toIndex, 0, moved);
    store.update((prev) => ({ ...prev, sort: 'custom', order: ids }));
  };

  return {
    isLoading,
    sort: layout.sort,
    /** All categories, arranged by the current sort. */
    categories,
    visibleCategories,
    hiddenCount: categories.length - visibleCategories.length,
    /** Number of entries in each category. */
    counts,
    isVisible: (id: RecordCategoryId) => !hidden.has(id),
    lastModified: (id: RecordCategoryId): Date | null => {
      const time = lastModified.get(id);
      return time ? new Date(time) : null;
    },
    setSort,
    moveCategory,
    setCategoryVisible,
    showAllCategories,
  };
}

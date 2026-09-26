import { RECORD_CATEGORIES, type RecordCategoryId } from '@/constants/record-categories';
import { createPersistentStore, readStoredArray } from '@/utils/persistent-store';

const STORAGE_KEY = 'hidden-record-categories';

/**
 * IDs of the record categories the user has hidden from the Records grid.
 * Only the grid reads this: hidden categories keep their entries, still
 * export, and open normally from a link.
 */
const store = createPersistentStore<RecordCategoryId>({
  storageKey: STORAGE_KEY,
  load: async () => (await readStoredArray<RecordCategoryId>(STORAGE_KEY)) ?? [],
  label: 'hidden record categories',
});

function setCategoryVisible(id: RecordCategoryId, visible: boolean) {
  store.update((prev) => {
    const hidden = prev.filter((hiddenId) => hiddenId !== id);
    return visible ? hidden : [...hidden, id];
  });
}

function showAllCategories() {
  store.update(() => []);
}

/** Which record categories are shown on the Records screen, persisted in AsyncStorage. */
export function useCategoryVisibility() {
  const { items: hiddenIds, isLoading } = store.useStore();
  const hidden = new Set<string>(hiddenIds);
  const visibleCategories = RECORD_CATEGORIES.filter((category) => !hidden.has(category.id));

  return {
    isLoading,
    visibleCategories,
    hiddenCount: RECORD_CATEGORIES.length - visibleCategories.length,
    isVisible: (id: RecordCategoryId) => !hidden.has(id),
    setCategoryVisible,
    showAllCategories,
  };
}

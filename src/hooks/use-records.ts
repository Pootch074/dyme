import type { RecordCategoryId } from '@/constants/record-categories';
import { createPersistentStore, generateId, readStoredArray } from '@/utils/persistent-store';
import { deleteSavedImage } from '@/utils/record-image';

export type RecordEntry = {
  id: string;
  category: RecordCategoryId;
  /** Field values keyed by the category's field keys (see constants/record-categories). */
  values: Record<string, string>;
  /** Saved photo (see utils/record-image), or null/absent when there is none. */
  imageRef?: string | null;
  createdAt: string;
};

export type RecordEntryInput = {
  values: Record<string, string>;
  imageRef: string | null;
};

const STORAGE_KEY = 'records';

/**
 * Where purchases lived before records had categories. Read once to migrate
 * and otherwise left untouched, so the original data stays as a backup.
 */
const LEGACY_PURCHASES_KEY = 'tracked-purchases';

type LegacyPurchase = {
  id: string;
  productName: string;
  brand?: string;
  model?: string;
  quantity?: number;
  purchaseDate: string;
  createdAt: string;
  imageRef?: string | null;
};

function fromLegacyPurchase(purchase: LegacyPurchase): RecordEntry {
  return {
    id: purchase.id,
    category: 'purchases',
    values: {
      name: purchase.productName ?? '',
      brand: purchase.brand ?? '',
      model: purchase.model ?? '',
      quantity: purchase.quantity != null ? String(purchase.quantity) : '',
      purchaseDate: purchase.purchaseDate ?? '',
    },
    imageRef: purchase.imageRef ?? null,
    createdAt: purchase.createdAt ?? new Date().toISOString(),
  };
}

async function loadEntries(): Promise<RecordEntry[]> {
  const stored = await readStoredArray<RecordEntry>(STORAGE_KEY);
  if (stored) return stored;

  const legacy = await readStoredArray<LegacyPurchase>(LEGACY_PURCHASES_KEY);
  return legacy ? legacy.map(fromLegacyPurchase) : [];
}

const store = createPersistentStore<RecordEntry>({
  storageKey: STORAGE_KEY,
  load: loadEntries,
  label: 'records',
});

function addEntry(category: RecordCategoryId, input: RecordEntryInput) {
  const entry: RecordEntry = {
    id: generateId(),
    category,
    values: input.values,
    imageRef: input.imageRef,
    createdAt: new Date().toISOString(),
  };
  store.update((prev) => [...prev, entry]);
}

function updateEntry(id: string, input: RecordEntryInput) {
  const previousImageRef = store.getItems().find((entry) => entry.id === id)?.imageRef;
  if (previousImageRef && previousImageRef !== input.imageRef) {
    deleteSavedImage(previousImageRef);
  }

  store.update((prev) =>
    prev.map((entry) =>
      entry.id === id ? { ...entry, values: input.values, imageRef: input.imageRef } : entry
    )
  );
}

function removeEntry(id: string) {
  const imageRef = store.getItems().find((entry) => entry.id === id)?.imageRef;
  if (imageRef) deleteSavedImage(imageRef);

  store.update((prev) => prev.filter((entry) => entry.id !== id));
}

/** Every record entry, across all categories, persisted in AsyncStorage (shared by all screens). */
export function useRecords() {
  const { items: entries, isLoading } = store.useStore();
  return { entries, isLoading, addEntry, updateEntry, removeEntry };
}

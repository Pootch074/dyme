import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { RecordCategoryId } from '@/constants/record-categories';
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
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }

  const legacyRaw = await AsyncStorage.getItem(LEGACY_PURCHASES_KEY);
  if (!legacyRaw) return [];
  const legacy = JSON.parse(legacyRaw);
  return Array.isArray(legacy) ? legacy.map(fromLegacyPurchase) : [];
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// One store shared by every screen using `useRecords`, so the category grid
// and a category's list always agree (e.g. counts update after adding).
type StoreState = { entries: RecordEntry[]; isLoading: boolean };

let state: StoreState = { entries: [], isLoading: true };
let loadStarted = false;
const listeners = new Set<() => void>();

function setState(next: StoreState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loadStarted) {
    loadStarted = true;
    loadEntries()
      .then((entries) => setState({ entries, isLoading: false }))
      .catch((error) => {
        console.warn('Failed to load records from storage', error);
        setState({ ...state, isLoading: false });
      });
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function updateEntries(update: (prev: RecordEntry[]) => RecordEntry[]) {
  // Writes before the initial load finishes would clobber stored data.
  if (state.isLoading) return;
  const entries = update(state.entries);
  setState({ ...state, entries });
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch((error) => {
    console.warn('Failed to save records to storage', error);
  });
}

function addEntry(category: RecordCategoryId, input: RecordEntryInput) {
  const entry: RecordEntry = {
    id: generateId(),
    category,
    values: input.values,
    imageRef: input.imageRef,
    createdAt: new Date().toISOString(),
  };
  updateEntries((prev) => [...prev, entry]);
}

function updateEntry(id: string, input: RecordEntryInput) {
  const previousImageRef = state.entries.find((entry) => entry.id === id)?.imageRef;
  if (previousImageRef && previousImageRef !== input.imageRef) {
    deleteSavedImage(previousImageRef);
  }

  updateEntries((prev) =>
    prev.map((entry) =>
      entry.id === id ? { ...entry, values: input.values, imageRef: input.imageRef } : entry
    )
  );
}

function removeEntry(id: string) {
  const imageRef = state.entries.find((entry) => entry.id === id)?.imageRef;
  if (imageRef) deleteSavedImage(imageRef);

  updateEntries((prev) => prev.filter((entry) => entry.id !== id));
}

/** Every record entry, across all categories, persisted in AsyncStorage. */
export function useRecords() {
  const { entries, isLoading } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { entries, isLoading, addEntry, updateEntry, removeEntry };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

type StoreState<T> = { items: T[]; isLoading: boolean };

/**
 * A list persisted in AsyncStorage and shared by every component that reads
 * it, so separate screens (e.g. a list and its details page) always agree.
 * Loads lazily on first subscribe via `load`, which can also migrate old data.
 */
export function createPersistentStore<T>(options: {
  storageKey: string;
  load: () => Promise<T[]>;
  label: string;
}) {
  let state: StoreState<T> = { items: [], isLoading: true };
  let loadStarted = false;
  const listeners = new Set<() => void>();

  const setState = (next: StoreState<T>) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    if (!loadStarted) {
      loadStarted = true;
      options
        .load()
        .then((items) => setState({ items, isLoading: false }))
        .catch((error) => {
          console.warn(`Failed to load ${options.label} from storage`, error);
          setState({ ...state, isLoading: false });
        });
    }
    return () => {
      listeners.delete(listener);
    };
  };

  const getSnapshot = () => state;

  /** Applies `change` and persists the result. Ignored until the initial load finishes, so it can't clobber stored data. */
  const update = (change: (prev: T[]) => T[]) => {
    if (state.isLoading) return;
    const items = change(state.items);
    setState({ ...state, items });
    AsyncStorage.setItem(options.storageKey, JSON.stringify(items)).catch((error) => {
      console.warn(`Failed to save ${options.label} to storage`, error);
    });
  };

  const useStore = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { useStore, update, getItems: () => state.items };
}

/** Reads a JSON array from AsyncStorage, or null when nothing is stored under `key`. */
export async function readStoredArray<T>(key: string): Promise<T[] | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

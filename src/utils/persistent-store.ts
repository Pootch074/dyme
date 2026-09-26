import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

type ValueState<T> = { value: T; isLoading: boolean };

/**
 * A value persisted in AsyncStorage and shared by every component that reads
 * it, so separate screens (e.g. a list and its details page) always agree.
 * Loads lazily on first subscribe (or `ensureLoaded`) via `load`, which can
 * also migrate old data; until then it reads as `initial`.
 */
export function createPersistentValue<T>(options: {
  storageKey: string;
  initial: T;
  load: () => Promise<T>;
  label: string;
}) {
  let state: ValueState<T> = { value: options.initial, isLoading: true };
  let loading: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const setState = (next: ValueState<T>) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  /** Starts the initial load if it hasn't yet; resolves once it's done. */
  const ensureLoaded = () => {
    loading ??= options
      .load()
      .then((value) => setState({ value, isLoading: false }))
      .catch((error) => {
        console.warn(`Failed to load ${options.label} from storage`, error);
        setState({ ...state, isLoading: false });
      });
    return loading;
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    ensureLoaded();
    return () => {
      listeners.delete(listener);
    };
  };

  const getSnapshot = () => state;

  /** Applies `change` and persists the result. Ignored until the initial load finishes, so it can't clobber stored data. */
  const update = (change: (prev: T) => T) => {
    if (state.isLoading) return;
    const value = change(state.value);
    setState({ ...state, value });
    AsyncStorage.setItem(options.storageKey, JSON.stringify(value)).catch((error) => {
      console.warn(`Failed to save ${options.label} to storage`, error);
    });
  };

  const useValue = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { useValue, update, ensureLoaded, getValue: () => state.value };
}

/** A list persisted in AsyncStorage and shared by every component that reads it (see createPersistentValue). */
export function createPersistentStore<T>(options: {
  storageKey: string;
  load: () => Promise<T[]>;
  label: string;
}) {
  const store = createPersistentValue<T[]>({ ...options, initial: [] });

  const useStore = () => {
    const { value, isLoading } = store.useValue();
    return { items: value, isLoading };
  };

  return { useStore, update: store.update, getItems: store.getValue };
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

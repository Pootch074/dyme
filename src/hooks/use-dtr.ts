import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type DtrEntry = {
  /** YYYY-MM-DD; at most one entry per date. */
  date: string;
  /** Morning time-in, as "HH:mm" (24h), or null if not recorded. */
  amIn: string | null;
  /** Lunch break-out. */
  lunchOut: string | null;
  /** Lunch break-in. */
  lunchIn: string | null;
  /** Afternoon time-out. */
  pmOut: string | null;
};

const STORAGE_KEY = 'dtr-entries';

/** Loads, persists, and mutates the user's daily time log in AsyncStorage. */
export function useDtr() {
  const [entries, setEntries] = useState<DtrEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setEntries(parsed);
      })
      .catch((error) => {
        console.warn('Failed to load DTR entries from storage', error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Skip until the initial load above finishes, so we don't clobber storage
    // with the empty starting state.
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch((error) => {
      console.warn('Failed to save DTR entries to storage', error);
    });
  }, [entries, isLoading]);

  /** Adds a new entry, or replaces the existing one for that date. */
  const saveEntry = useCallback((entry: DtrEntry) => {
    setEntries((prev) => [...prev.filter((item) => item.date !== entry.date), entry]);
  }, []);

  const removeEntry = useCallback((date: string) => {
    setEntries((prev) => prev.filter((item) => item.date !== date));
  }, []);

  return { entries, isLoading, saveEntry, removeEntry };
}

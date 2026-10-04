import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { getLocalVersion, onLocalChange } from '@/sync/change-events';
import { createCollections } from '@/sync/collections';
import { createCryptoMeta, keyMatchesMeta, unlockWithMeta } from '@/sync/crypto-core';
import { EMPTY_META, runSync, type SyncMeta } from '@/sync/engine';
import { createImageSync } from '@/sync/images';
import { clearKey, loadKey, saveKey } from '@/sync/key-store';
import { randomBytes } from '@/sync/random';
import {
  createRemote,
  fetchCryptoMeta,
  insertCryptoMeta,
  OfflineError,
  SetupError,
} from '@/sync/remote';

/**
 * - `off`: signed out.
 * - `checking`: working out whether backup is set up (or couldn't reach the server to find out).
 * - `needs-setup`: nothing online yet; the user must choose a passphrase.
 * - `locked`: backup exists online, but this phone doesn't have the key yet.
 * - `ready`: syncing.
 */
export type SyncStatus = 'off' | 'checking' | 'needs-setup' | 'locked' | 'ready';

export type SetupResult = 'ok' | 'already-set-up' | 'error';
export type UnlockResult = 'ok' | 'wrong-passphrase' | 'not-set-up' | 'error';

type SyncContextValue = {
  status: SyncStatus;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  /** What to tell the user when the last attempt didn't work, or null. */
  error: string | null;
  syncNow: () => void;
  /** First time: choose the passphrase that encrypts sensitive data. */
  setUpBackup: (passphrase: string) => Promise<SetupResult>;
  /** Another phone already set it up: enter the same passphrase. */
  unlock: (passphrase: string) => Promise<UnlockResult>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

const SYNC_INTERVAL_MS = 2 * 60 * 1000;
const LOCAL_CHANGE_DELAY_MS = 4000;

function describeError(error: unknown): string {
  if (error instanceof OfflineError) {
    return "Offline. Your changes are saved on this phone and will upload when you're back online.";
  }
  if (error instanceof SetupError) {
    return "Online backup isn't set up on the server yet (run supabase/schema.sql in the Supabase SQL editor).";
  }
  return "Couldn't sync. It will try again shortly.";
}

const metaKey = (userId: string) => `sync-meta-${userId}`;

async function loadMeta(userId: string): Promise<SyncMeta> {
  try {
    const raw = await AsyncStorage.getItem(metaKey(userId));
    if (raw) return { ...EMPTY_META, ...JSON.parse(raw) };
  } catch (error) {
    console.warn('Failed to read sync state', error);
  }
  return { cursors: {}, items: {}, extras: {} };
}

/**
 * Keeps the phone's data and the online copy in step while signed in:
 * on open, when the app returns to the foreground, every couple of minutes,
 * and shortly after every edit. Offline, nothing is lost: it just catches up
 * later. See src/sync for how.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [status, setStatus] = useState<SyncStatus>('checking');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const keyRef = useRef<Uint8Array | null>(null);
  const verifiedRef = useRef(false);
  const runningRef = useRef(false);
  const rerunRef = useRef(false);
  const [attempt, setAttempt] = useState(0);

  /**
   * Works out where this phone stands: key already saved (ready), backup not
   * set up yet, or set up elsewhere (locked). `attempt` re-runs it after the
   * server couldn't be reached.
   */
  useEffect(() => {
    if (!userId) {
      keyRef.current = null;
      return;
    }
    let cancelled = false;
    keyRef.current = null;
    verifiedRef.current = false;

    loadKey(userId)
      .then(async (saved) => {
        if (cancelled) return;
        setError(null);
        if (saved) {
          keyRef.current = saved;
          setStatus('ready');
          return;
        }
        try {
          const meta = await fetchCryptoMeta();
          if (!cancelled) setStatus(meta ? 'locked' : 'needs-setup');
        } catch (caught) {
          if (cancelled) return;
          setStatus('checking');
          setError(describeError(caught));
        }
      })
      .catch((caught) => {
        console.warn('Failed to prepare online backup', caught);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const run = useCallback(async () => {
    const key = keyRef.current;
    if (!userId || !key) return;
    if (runningRef.current) {
      rerunRef.current = true;
      return;
    }
    runningRef.current = true;
    setIsSyncing(true);
    try {
      do {
        rerunRef.current = false;

        if (!verifiedRef.current) {
          // Once per launch: make sure the saved key still matches the online setup.
          const meta = await fetchCryptoMeta();
          if (!meta) {
            await clearKey(userId);
            keyRef.current = null;
            setStatus('needs-setup');
            return;
          }
          if (!keyMatchesMeta(key, meta)) {
            await clearKey(userId);
            keyRef.current = null;
            setStatus('locked');
            return;
          }
          verifiedRef.current = true;
        }

        const images = createImageSync(userId, key, randomBytes);
        await runSync({
          collections: createCollections(key, randomBytes),
          remote: createRemote(userId),
          loadMeta: () => loadMeta(userId),
          saveMeta: (meta) => AsyncStorage.setItem(metaKey(userId), JSON.stringify(meta)),
          localVersion: getLocalVersion,
          afterPull: images.restoreMissing,
          beforePush: images.uploadNew,
          afterPush: images.removeOrphans,
        });
        setLastSyncedAt(new Date());
        setError(null);
      } while (rerunRef.current);
    } catch (caught) {
      if (!(caught instanceof OfflineError)) console.warn('Sync failed', caught);
      setError(describeError(caught));
    } finally {
      runningRef.current = false;
      setIsSyncing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (status !== 'ready') return;

    // Not called directly: starting a sync updates state, which an effect shouldn't do synchronously.
    const first = setTimeout(run, 0);
    const interval = setInterval(run, SYNC_INTERVAL_MS);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stopWatching = onLocalChange(() => {
      clearTimeout(timer);
      timer = setTimeout(run, LOCAL_CHANGE_DELAY_MS);
    });

    return () => {
      clearTimeout(first);
      clearInterval(interval);
      clearTimeout(timer);
      appState.remove();
      stopWatching();
    };
  }, [status, run]);

  const setUpBackup = useCallback(
    async (passphrase: string): Promise<SetupResult> => {
      if (!userId) return 'error';
      try {
        const { key, meta } = await createCryptoMeta(passphrase, randomBytes);
        if (!(await insertCryptoMeta(userId, meta))) {
          // Another phone got there first; this one just needs the passphrase.
          setStatus('locked');
          return 'already-set-up';
        }
        await saveKey(userId, key);
        keyRef.current = key;
        verifiedRef.current = true;
        setError(null);
        setStatus('ready');
        return 'ok';
      } catch (caught) {
        console.warn('Backup setup failed', caught);
        setError(describeError(caught));
        return 'error';
      }
    },
    [userId]
  );

  const unlock = useCallback(
    async (passphrase: string): Promise<UnlockResult> => {
      if (!userId) return 'error';
      try {
        const meta = await fetchCryptoMeta();
        if (!meta) {
          setStatus('needs-setup');
          return 'not-set-up';
        }
        const key = await unlockWithMeta(passphrase, meta);
        if (!key) return 'wrong-passphrase';
        await saveKey(userId, key);
        keyRef.current = key;
        verifiedRef.current = true;
        setError(null);
        setStatus('ready');
        return 'ok';
      } catch (caught) {
        console.warn('Unlock failed', caught);
        setError(describeError(caught));
        return 'error';
      }
    },
    [userId]
  );

  const syncNow = useCallback(() => {
    if (status === 'ready') run();
    else if (status === 'checking') setAttempt((count) => count + 1);
  }, [status, run]);

  // Signed out: nothing from a previous session should show.
  const signedIn = userId !== null;
  const value = useMemo(
    () => ({
      status: signedIn ? status : ('off' as const),
      isSyncing: signedIn && isSyncing,
      lastSyncedAt: signedIn ? lastSyncedAt : null,
      error: signedIn ? error : null,
      syncNow,
      setUpBackup,
      unlock,
    }),
    [signedIn, status, isSyncing, lastSyncedAt, error, syncNow, setUpBackup, unlock]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used inside SyncProvider');
  return context;
}

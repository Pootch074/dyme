/**
 * Lets storage and sync tell each other what happened, without either
 * importing the other: local edits ask for an upload, and changes downloaded
 * from the server ask the screens' stores to reload.
 */

let localVersion = 0;
const localChangeListeners = new Set<() => void>();
const remoteAppliedListeners = new Map<string, Set<() => void>>();

/** Increases on every edit made on this phone; the sync engine uses it to avoid overwriting an edit made mid-sync. */
export function getLocalVersion(): number {
  return localVersion;
}

/** Call after the user's change has been saved to storage. */
export function notifyLocalChange(): void {
  localVersion++;
  localChangeListeners.forEach((listener) => listener());
}

export function onLocalChange(listener: () => void): () => void {
  localChangeListeners.add(listener);
  return () => {
    localChangeListeners.delete(listener);
  };
}

/** Call after sync replaced what's stored under `storageKey` with newer data from the server. */
export function notifyRemoteApplied(storageKey: string): void {
  remoteAppliedListeners.get(storageKey)?.forEach((listener) => listener());
}

/** `listener` runs when sync changed what's stored under `storageKey`, so it should reload. */
export function onRemoteApplied(storageKey: string, listener: () => void): () => void {
  let listeners = remoteAppliedListeners.get(storageKey);
  if (!listeners) {
    listeners = new Set();
    remoteAppliedListeners.set(storageKey, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

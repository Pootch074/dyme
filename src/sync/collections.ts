import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadDtrEntries } from '@/hooks/use-dtr';
import { loadProfile } from '@/hooks/use-profile';
import { loadEntries, type RecordEntry } from '@/hooks/use-records';
import { loadShoppingRecords } from '@/hooks/use-shopping';
import { notifyRemoteApplied } from '@/sync/change-events';
import { type RandomBytes } from '@/sync/crypto-core';
import type { SyncCollection, SyncItem } from '@/sync/engine';
import { decodeRecord, encodeRecord } from '@/sync/records-codec';

/** Replaces a stored list and tells the screens using it to reload. */
async function writeList(storageKey: string, items: SyncItem[]) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(items.map((item) => item.value)));
  notifyRemoteApplied(storageKey);
}

function listCollection<T>(options: {
  name: string;
  storageKey: string;
  load: () => Promise<T[]>;
  idOf: (item: T) => string;
  encode?: (value: T) => unknown;
  decode?: (data: unknown) => T;
}): SyncCollection {
  return {
    name: options.name,
    read: async () => (await options.load()).map((value) => ({ id: options.idOf(value), value })),
    write: (items) => writeList(options.storageKey, items),
    encode: (value) => (options.encode ? options.encode(value as T) : value),
    decode: (data) => (options.decode ? options.decode(data) : data),
  };
}

/** A single stored object (profile, layout), synced as one item. Nothing stored means no item. */
function singleCollection<T>(options: {
  name: string;
  storageKey: string;
  load: () => Promise<T | null>;
}): SyncCollection {
  return {
    name: options.name,
    read: async () => {
      const value = await options.load();
      return value === null ? [] : [{ id: 'only', value }];
    },
    write: async (items) => {
      if (items.length === 0) return;
      await AsyncStorage.setItem(options.storageKey, JSON.stringify(items[0].value));
      notifyRemoteApplied(options.storageKey);
    },
    encode: (value) => value,
    decode: (data) => data,
  };
}

/**
 * Everything that is kept online, and where it lives on the phone. `key`
 * encrypts the secret record fields (see records-codec) before upload.
 */
export function createCollections(key: Uint8Array, random: RandomBytes): SyncCollection[] {
  return [
    listCollection<RecordEntry>({
      name: 'records',
      storageKey: 'records',
      load: loadEntries,
      idOf: (entry) => entry.id,
      encode: (entry) => encodeRecord(entry, key, random),
      decode: (data) => decodeRecord(data as RecordEntry, key),
    }),
    listCollection({
      name: 'shopping',
      storageKey: 'shopping-records',
      load: loadShoppingRecords,
      idOf: (record) => record.id,
    }),
    listCollection({
      name: 'dtr',
      storageKey: 'dtr-entries',
      load: loadDtrEntries,
      idOf: (entry) => entry.date,
    }),
    singleCollection({
      name: 'profile',
      storageKey: 'user-profile',
      load: async () => {
        const profile = await loadProfile();
        // The profile screen saves an empty profile on first open; that isn't
        // data, and must never overwrite a real one stored online.
        return Object.values(profile).every((field) => !field) ? null : profile;
      },
    }),
    singleCollection({
      name: 'category-layout',
      storageKey: 'record-category-layout',
      load: async () => {
        const raw = await AsyncStorage.getItem('record-category-layout');
        return raw ? JSON.parse(raw) : null;
      },
    }),
  ];
}

/**
 * Two-way sync between the phone's own storage and the online copy.
 *
 * The phone stays the source the app reads and writes (so everything works
 * offline). This only exchanges changes with the server when it can:
 * - Pull: rows changed online since the last pull are applied locally, unless
 *   that item also changed on this phone (then the phone's version wins).
 * - Push: items that differ from what was last synced are uploaded; items
 *   that disappeared locally are uploaded as deletions.
 *
 * Pure (no React Native or Supabase imports) so it runs unchanged in tests.
 */

export type SyncItem = { id: string; value: unknown };

/** One kind of data (records, shopping, ...) and how to read and replace it locally. */
export type SyncCollection = {
  /** Name used online. */
  name: string;
  /** Every local item. Items that don't exist yet (nothing saved) are simply absent. */
  read: () => Promise<SyncItem[]>;
  /** Replaces the whole local list. */
  write: (items: SyncItem[]) => Promise<void>;
  /** Local value to the JSON stored online (e.g. encrypting secret fields). */
  encode: (value: unknown) => unknown;
  /** The inverse of `encode`; throws when it can't (wrong key). */
  decode: (data: unknown) => unknown;
};

export type RemoteRow = {
  item_id: string;
  data: unknown;
  deleted: boolean;
  /** Server-assigned; ordering and the pull cursor use it, never the phone's clock. */
  updated_at: string;
};

export type RemoteWrite = { collection: string; item_id: string; data: unknown; deleted: boolean };

export type Remote = {
  /** Rows of `collection` changed after `after` (null = all), oldest first, at most `limit`. */
  pull: (collection: string, after: string | null, limit: number) => Promise<RemoteRow[]>;
  push: (rows: RemoteWrite[]) => Promise<void>;
};

export type ItemMeta = {
  /** Hash of the value as last synced, or null once its deletion was synced. */
  hash: string | null;
};

export type SyncMeta = {
  /** `updated_at` of the newest row pulled, per collection. */
  cursors: Record<string, string>;
  items: Record<string, Record<string, ItemMeta>>;
  /** Free space for extensions (photo sync keeps what it uploaded here). */
  extras: Record<string, unknown>;
};

export const EMPTY_META: SyncMeta = { cursors: {}, items: {}, extras: {} };

export type SyncEnv = {
  collections: SyncCollection[];
  remote: Remote;
  loadMeta: () => Promise<SyncMeta>;
  saveMeta: (meta: SyncMeta) => Promise<void>;
  /** Increases whenever the user changes something locally; guards against overwriting a change made mid-sync. */
  localVersion: () => number;
  /** Photo sync etc., run around the data pass. */
  afterPull?: (meta: SyncMeta) => Promise<void>;
  beforePush?: (meta: SyncMeta) => Promise<void>;
  afterPush?: (meta: SyncMeta) => Promise<void>;
};

export type SyncResult = {
  pulled: number;
  pushed: number;
  /** Rows that couldn't be decoded and were left alone. */
  skipped: number;
  /** Collections whose pull was postponed because the user changed something meanwhile. */
  postponed: string[];
};

const PAGE_SIZE = 500;
const PUSH_BATCH = 100;

/** cyrb53: a fast, well-spread 53-bit string hash; only used to notice that a value changed. */
export function hashValue(value: unknown): string {
  const text = JSON.stringify(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

async function pullCollection(
  collection: SyncCollection,
  env: SyncEnv,
  meta: SyncMeta,
  result: SyncResult
): Promise<void> {
  const rows: RemoteRow[] = [];
  let after: string | null = meta.cursors[collection.name] ?? null;
  for (;;) {
    const page = await env.remote.pull(collection.name, after, PAGE_SIZE);
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    after = page[page.length - 1].updated_at;
  }
  if (rows.length === 0) return;

  const version = env.localVersion();
  const byId = new Map((await collection.read()).map((item) => [item.id, item]));
  const itemsMeta = (meta.items[collection.name] ??= {});
  const nextMeta: [string, ItemMeta][] = [];
  let changed = false;

  for (const row of rows) {
    const id = row.item_id;
    const current = byId.get(id);
    const known = itemsMeta[id];
    // Changed on this phone since it was last synced (or never synced).
    const dirty = current !== undefined && known?.hash !== hashValue(current.value);
    // Removed on this phone, and that removal hasn't been uploaded yet.
    const removedLocally = current === undefined && known !== undefined && known.hash !== null;

    if (row.deleted) {
      if (current && !dirty) {
        byId.delete(id);
        changed = true;
        nextMeta.push([id, { hash: null }]);
      } else if (!current) {
        nextMeta.push([id, { hash: null }]);
      }
      continue;
    }

    if (removedLocally) continue;

    let value: unknown;
    try {
      value = collection.decode(row.data);
    } catch (error) {
      console.warn(`Skipping an undecodable ${collection.name} row`, error);
      result.skipped++;
      continue;
    }
    const hash = hashValue(value);

    if (current && dirty) {
      // The phone's version wins and is uploaded below, unless it already matches.
      if (hashValue(current.value) === hash) nextMeta.push([id, { hash }]);
      continue;
    }
    if (!current || hashValue(current.value) !== hash) {
      byId.set(id, { id, value });
      changed = true;
      result.pulled++;
    }
    nextMeta.push([id, { hash }]);
  }

  if (changed) {
    if (env.localVersion() !== version) {
      // The user changed something while this was running; try again next time
      // rather than overwrite it with an older copy.
      result.postponed.push(collection.name);
      return;
    }
    await collection.write([...byId.values()]);
  }
  for (const [id, itemMeta] of nextMeta) itemsMeta[id] = itemMeta;
  meta.cursors[collection.name] = rows[rows.length - 1].updated_at;
  await env.saveMeta(meta);
}

async function pushCollection(
  collection: SyncCollection,
  env: SyncEnv,
  meta: SyncMeta,
  result: SyncResult
): Promise<void> {
  const local = await collection.read();
  const itemsMeta = (meta.items[collection.name] ??= {});
  const outgoing: { write: RemoteWrite; hash: string | null }[] = [];
  const present = new Set<string>();

  for (const item of local) {
    present.add(item.id);
    const hash = hashValue(item.value);
    if (itemsMeta[item.id]?.hash === hash) continue;
    outgoing.push({
      write: {
        collection: collection.name,
        item_id: item.id,
        data: collection.encode(item.value),
        deleted: false,
      },
      hash,
    });
  }
  for (const [id, itemMeta] of Object.entries(itemsMeta)) {
    if (present.has(id) || itemMeta.hash === null) continue;
    outgoing.push({
      write: { collection: collection.name, item_id: id, data: null, deleted: true },
      hash: null,
    });
  }

  for (let start = 0; start < outgoing.length; start += PUSH_BATCH) {
    const batch = outgoing.slice(start, start + PUSH_BATCH);
    await env.remote.push(batch.map((entry) => entry.write));
    for (const entry of batch) itemsMeta[entry.write.item_id] = { hash: entry.hash };
    result.pushed += batch.length;
    await env.saveMeta(meta);
  }
}

export async function runSync(env: SyncEnv): Promise<SyncResult> {
  const result: SyncResult = { pulled: 0, pushed: 0, skipped: 0, postponed: [] };
  const meta = await env.loadMeta();
  meta.cursors ??= {};
  meta.items ??= {};
  meta.extras ??= {};

  for (const collection of env.collections) await pullCollection(collection, env, meta, result);
  await env.afterPull?.(meta);
  await env.beforePush?.(meta);
  for (const collection of env.collections) await pushCollection(collection, env, meta, result);
  await env.afterPush?.(meta);
  await env.saveMeta(meta);
  return result;
}

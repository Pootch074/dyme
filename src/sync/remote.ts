import type { CryptoMeta } from '@/sync/crypto-core';
import type { Remote } from '@/sync/engine';
import { supabase } from '@/lib/supabase';

/** The table and storage bucket from supabase/schema.sql. */
const TABLE = 'app_data';
export const IMAGE_BUCKET = 'record-images';

const META_COLLECTION = '_meta';
const CRYPTO_ITEM = 'crypto';

/** A request that never reached the server (no connection), as opposed to one it refused. */
export class OfflineError extends Error {
  constructor() {
    super('No connection to the server.');
    this.name = 'OfflineError';
  }
}

/** Setup is missing on the server, e.g. supabase/schema.sql wasn't run. */
export class SetupError extends Error {
  constructor() {
    super('Online backup is not set up on the server yet.');
    this.name = 'SetupError';
  }
}

type DbError = { message: string; code?: string; details?: string };

/** Turns a Supabase error into one of ours. Only the code is logged: messages can echo data. */
export function toSyncError(error: DbError): Error {
  const looksOffline = !error.code && /network|fetch|timed? ?out|connection/i.test(error.message);
  if (looksOffline) return new OfflineError();
  // 42P01: table doesn't exist. PGRST205: not in the API's schema cache.
  if (error.code === '42P01' || error.code === 'PGRST205') return new SetupError();
  console.warn('Sync request failed', error.code ?? 'no-code');
  return new Error('The server refused the request.');
}

export function createRemote(userId: string): Remote {
  return {
    pull: async (collection, after, limit) => {
      let query = supabase
        .from(TABLE)
        .select('item_id, data, deleted, updated_at')
        .eq('collection', collection)
        .order('updated_at', { ascending: true })
        .limit(limit);
      if (after !== null) query = query.gt('updated_at', after);
      const { data, error } = await query;
      if (error) throw toSyncError(error);
      return data ?? [];
    },
    push: async (rows) => {
      const { error } = await supabase
        .from(TABLE)
        .upsert(
          rows.map((row) => ({ ...row, user_id: userId })),
          { onConflict: 'user_id,collection,item_id' }
        );
      if (error) throw toSyncError(error);
    },
  };
}

/** The passphrase check stored online by whichever device set backup up first, or null when none. */
export async function fetchCryptoMeta(): Promise<CryptoMeta | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('collection', META_COLLECTION)
    .eq('item_id', CRYPTO_ITEM)
    .maybeSingle();
  if (error) throw toSyncError(error);
  return (data?.data as CryptoMeta | undefined) ?? null;
}

/** Stores the passphrase check. Never overwrites: returns false when one already exists. */
export async function insertCryptoMeta(userId: string, meta: CryptoMeta): Promise<boolean> {
  const { error } = await supabase.from(TABLE).insert({
    user_id: userId,
    collection: META_COLLECTION,
    item_id: CRYPTO_ITEM,
    data: meta,
    deleted: false,
  });
  if (!error) return true;
  if (error.code === '23505') return false;
  throw toSyncError(error);
}

import { File, Paths } from 'expo-file-system';

import { supabase } from '@/lib/supabase';
import { loadEntries } from '@/hooks/use-records';
import { decryptBytes, encryptBytes, type RandomBytes } from '@/sync/crypto-core';
import type { SyncMeta } from '@/sync/engine';
import { IMAGE_BUCKET, toSyncError } from '@/sync/remote';
import { readSavedImage, savedImageExists, writeSavedImage } from '@/utils/record-image';

/**
 * Photos on records: encrypted on the phone, then kept in a private storage
 * bucket under `<user id>/<file name>`. What was uploaded or restored is
 * remembered in `meta.extras.images`.
 */

type ImageSteps = {
  restoreMissing: (meta: SyncMeta) => Promise<void>;
  uploadNew: (meta: SyncMeta) => Promise<void>;
  removeOrphans: (meta: SyncMeta) => Promise<void>;
};

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function knownImages(meta: SyncMeta): Record<string, true> {
  const images = (meta.extras.images ??= {}) as Record<string, true>;
  return images;
}

/** File names of the photos on the phone's records (web keeps photos inside the record instead). */
async function referencedImages(): Promise<string[]> {
  const refs = (await loadEntries())
    .map((entry) => entry.imageRef)
    .filter((ref): ref is string => Boolean(ref) && !ref!.startsWith('data:'));
  return [...new Set(refs)];
}

export function createImageSync(userId: string, key: Uint8Array, random: RandomBytes): ImageSteps {
  const bucket = () => supabase.storage.from(IMAGE_BUCKET);
  const pathOf = (ref: string) => `${userId}/${ref}`;

  return {
    /** Photos that other records point to but this phone doesn't have yet. */
    async restoreMissing(meta) {
      const images = knownImages(meta);
      for (const ref of await referencedImages()) {
        if (savedImageExists(ref)) continue;
        try {
          const { data, error } = await bucket().createSignedUrl(pathOf(ref), 120);
          if (error || !data) continue; // not uploaded (yet)
          const download = new File(Paths.cache, `restore-${Date.now()}-${ref}`);
          await File.downloadFileAsync(data.signedUrl, download, { idempotent: true });
          const sealed = new Uint8Array(await download.arrayBuffer());
          download.delete();
          writeSavedImage(ref, decryptBytes(key, sealed));
          images[ref] = true;
        } catch (error) {
          console.warn('Failed to restore a photo', error instanceof Error ? error.name : error);
        }
        await yieldToUi();
      }
    },

    /** Photos on this phone that aren't online yet. */
    async uploadNew(meta) {
      const images = knownImages(meta);
      for (const ref of await referencedImages()) {
        if (images[ref] || !savedImageExists(ref)) continue;
        const sealed = encryptBytes(key, await readSavedImage(ref), random);
        const { error } = await bucket().upload(pathOf(ref), sealed.buffer as ArrayBuffer, {
          contentType: 'application/octet-stream',
          upsert: true,
        });
        if (error) throw toSyncError(error);
        images[ref] = true;
        await yieldToUi();
      }
    },

    /** Online photos whose record was deleted or whose photo was replaced. */
    async removeOrphans(meta) {
      const images = knownImages(meta);
      const wanted = new Set(await referencedImages());
      // With no photos referenced at all, a read problem is as likely as a
      // real clean-up, so leave things alone rather than risk deleting them all.
      if (wanted.size === 0) return;
      const orphans = Object.keys(images).filter((ref) => !wanted.has(ref));
      if (orphans.length === 0) return;
      const { error } = await bucket().remove(orphans.map(pathOf));
      if (error) throw toSyncError(error);
      for (const ref of orphans) delete images[ref];
    },
  };
}

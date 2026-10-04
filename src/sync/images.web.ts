import type { RandomBytes } from '@/sync/crypto-core';
import type { SyncMeta } from '@/sync/engine';

type ImageSteps = {
  restoreMissing: (meta: SyncMeta) => Promise<void>;
  uploadNew: (meta: SyncMeta) => Promise<void>;
  removeOrphans: (meta: SyncMeta) => Promise<void>;
};

const nothing = async () => {};

/** On web a photo lives inside its record (as an encrypted data: URL), so there are no separate files to sync. */
export function createImageSync(_userId: string, _key: Uint8Array, _random: RandomBytes): ImageSteps {
  return { restoreMissing: nothing, uploadNew: nothing, removeOrphans: nothing };
}

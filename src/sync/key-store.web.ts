// The browser has no secure storage, so the key is only kept in memory: the
// passphrase is asked again after a reload. (The web version is for
// development; the phone app is the one meant to be used.)
const keys = new Map<string, Uint8Array>();

export async function loadKey(userId: string): Promise<Uint8Array | null> {
  return keys.get(userId) ?? null;
}

export async function saveKey(userId: string, key: Uint8Array): Promise<void> {
  keys.set(userId, key);
}

export async function clearKey(userId: string): Promise<void> {
  keys.delete(userId);
}

import * as SecureStore from 'expo-secure-store';

import { fromBase64, toBase64 } from '@/sync/base64';

// SecureStore keys may only contain letters, digits, ".", "-" and "_".
const storeKey = (userId: string) => `dyme-backup-key-${userId.replace(/[^a-zA-Z0-9]/g, '_')}`;

/**
 * Keeps the derived encryption key in the device's secure storage (Android
 * Keystore / iOS Keychain), so the passphrase is asked once per phone.
 */
export async function loadKey(userId: string): Promise<Uint8Array | null> {
  try {
    const saved = await SecureStore.getItemAsync(storeKey(userId));
    return saved ? fromBase64(saved) : null;
  } catch (error) {
    console.warn('Failed to read the backup key', error);
    return null;
  }
}

export async function saveKey(userId: string, key: Uint8Array): Promise<void> {
  await SecureStore.setItemAsync(storeKey(userId), toBase64(key));
}

export async function clearKey(userId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(storeKey(userId));
  } catch (error) {
    console.warn('Failed to clear the backup key', error);
  }
}

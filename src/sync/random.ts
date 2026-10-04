import { getRandomBytes } from 'expo-crypto';

/** Cryptographically secure random bytes, for salts and encryption nonces. */
export function randomBytes(length: number): Uint8Array {
  return getRandomBytes(length);
}

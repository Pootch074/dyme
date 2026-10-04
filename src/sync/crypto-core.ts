import { gcm } from '@noble/ciphers/aes.js';
import { bytesToUtf8, utf8ToBytes } from '@noble/ciphers/utils.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { fromBase64, toBase64 } from './base64';

/**
 * End-to-end encryption for what is stored online. The key is derived from a
 * passphrase only the user knows, and values are encrypted with AES-256-GCM
 * before they leave the phone, so the server only ever holds ciphertext for
 * them. Lose the passphrase and that data can't be recovered.
 *
 * Pure (no React Native or Expo imports): random bytes are passed in, so this
 * runs unchanged in tests.
 */

export type RandomBytes = (length: number) => Uint8Array;

/** What the server stores to let a new device check a passphrase (never the key). */
export type CryptoMeta = {
  v: 1;
  kdf: 'pbkdf2-sha256';
  iterations: number;
  /** Base64 random salt. */
  salt: string;
  /** A known phrase encrypted with the key, to tell a wrong passphrase from a right one. */
  check: string;
};

/** Stored in the meta so it can be raised later without breaking existing setups. */
export const KDF_ITERATIONS = 200_000;

const TEXT_PREFIX = 'enc1:';
const CHECK_PHRASE = 'dyme-backup-v1';
const IV_LENGTH = 12;
const BINARY_MAGIC = utf8ToBytes('DYM1');

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  // asyncTick keeps the UI responsive while the (deliberately slow) derivation runs.
  return pbkdf2Async(sha256, utf8ToBytes(passphrase.normalize('NFKC')), salt, {
    c: iterations,
    dkLen: 32,
    asyncTick: 8,
  });
}

export function isEncryptedText(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(TEXT_PREFIX);
}

export function encryptText(key: Uint8Array, text: string, random: RandomBytes): string {
  const iv = random(IV_LENGTH);
  const sealed = gcm(key, iv).encrypt(utf8ToBytes(text));
  const packed = new Uint8Array(iv.length + sealed.length);
  packed.set(iv, 0);
  packed.set(sealed, iv.length);
  return TEXT_PREFIX + toBase64(packed);
}

/** Throws when the key is wrong or the value was tampered with (GCM is authenticated). */
export function decryptText(key: Uint8Array, encrypted: string): string {
  if (!isEncryptedText(encrypted)) throw new Error('Value is not encrypted text.');
  const packed = fromBase64(encrypted.slice(TEXT_PREFIX.length));
  const iv = packed.subarray(0, IV_LENGTH);
  return bytesToUtf8(gcm(key, iv).decrypt(packed.subarray(IV_LENGTH)));
}

/** For photos: `DYM1` + iv + ciphertext, as raw bytes (no base64 overhead). */
export function encryptBytes(key: Uint8Array, bytes: Uint8Array, random: RandomBytes): Uint8Array {
  const iv = random(IV_LENGTH);
  const sealed = gcm(key, iv).encrypt(bytes);
  const packed = new Uint8Array(BINARY_MAGIC.length + iv.length + sealed.length);
  packed.set(BINARY_MAGIC, 0);
  packed.set(iv, BINARY_MAGIC.length);
  packed.set(sealed, BINARY_MAGIC.length + iv.length);
  return packed;
}

export function decryptBytes(key: Uint8Array, packed: Uint8Array): Uint8Array {
  const header = BINARY_MAGIC.length;
  if (packed.length < header + IV_LENGTH || bytesToUtf8(packed.subarray(0, header)) !== 'DYM1') {
    throw new Error('Not an encrypted file.');
  }
  const iv = packed.subarray(header, header + IV_LENGTH);
  return gcm(key, iv).decrypt(packed.subarray(header + IV_LENGTH));
}

/** First-time setup: a new salt, the key it gives, and the meta to store online. */
export async function createCryptoMeta(
  passphrase: string,
  random: RandomBytes,
  iterations: number = KDF_ITERATIONS
): Promise<{ key: Uint8Array; meta: CryptoMeta }> {
  const salt = random(16);
  const key = await deriveKey(passphrase, salt, iterations);
  const meta: CryptoMeta = {
    v: 1,
    kdf: 'pbkdf2-sha256',
    iterations,
    salt: toBase64(salt),
    check: encryptText(key, CHECK_PHRASE, random),
  };
  return { key, meta };
}

/** Whether `key` is the one that `meta` was made with. */
export function keyMatchesMeta(key: Uint8Array, meta: CryptoMeta): boolean {
  try {
    return decryptText(key, meta.check) === CHECK_PHRASE;
  } catch {
    return false;
  }
}

/** The key for `passphrase` on an existing setup, or null when the passphrase is wrong. */
export async function unlockWithMeta(
  passphrase: string,
  meta: CryptoMeta
): Promise<Uint8Array | null> {
  const key = await deriveKey(passphrase, fromBase64(meta.salt), meta.iterations);
  return keyMatchesMeta(key, meta) ? key : null;
}

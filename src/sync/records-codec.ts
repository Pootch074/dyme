import { RECORD_CATEGORIES, type RecordField } from '../constants/record-categories';
import type { RecordEntry } from '../hooks/use-records';

import { decryptText, encryptText, isEncryptedText, type RandomBytes } from './crypto-core';

/**
 * Which record fields are encrypted before upload: every field the app masks
 * (`sensitive`: account and card numbers, passwords) plus ID/document numbers.
 * Everything else is stored as plain JSON, protected by the database rules.
 */
const EXTRA_SECRET_FIELDS: Record<string, readonly string[]> = {
  ids: ['documentNumber'],
};

const secretKeysByCategory = new Map<string, Set<string>>(
  RECORD_CATEGORIES.map((category) => [
    category.id,
    new Set([
      ...(category.fields as readonly RecordField[])
        .filter((field) => field.sensitive)
        .map((field) => field.key),
      ...(EXTRA_SECRET_FIELDS[category.id] ?? []),
    ]),
  ])
);

/** On web a photo is kept inside the entry as a data: URL, so it travels encrypted too. */
function holdsInlineImage(imageRef: string | null | undefined): imageRef is string {
  return typeof imageRef === 'string' && imageRef.startsWith('data:');
}

/** The entry as it is uploaded: secret fields (and an inline web photo) are ciphertext. */
export function encodeRecord(entry: RecordEntry, key: Uint8Array, random: RandomBytes): RecordEntry {
  const secrets = secretKeysByCategory.get(entry.category);
  const values = Object.fromEntries(
    Object.entries(entry.values).map(([field, value]) => [
      field,
      secrets?.has(field) && value ? encryptText(key, value, random) : value,
    ])
  );
  const imageRef = holdsInlineImage(entry.imageRef)
    ? encryptText(key, entry.imageRef, random)
    : entry.imageRef;
  return { ...entry, values, imageRef };
}

/** The inverse of `encodeRecord`; throws when the key is wrong. */
export function decodeRecord(entry: RecordEntry, key: Uint8Array): RecordEntry {
  const secrets = secretKeysByCategory.get(entry.category);
  const values = Object.fromEntries(
    Object.entries(entry.values).map(([field, value]) => [
      field,
      secrets?.has(field) && isEncryptedText(value) ? decryptText(key, value) : value,
    ])
  );
  const imageRef = isEncryptedText(entry.imageRef) ? decryptText(key, entry.imageRef) : entry.imageRef;
  return { ...entry, values, imageRef };
}

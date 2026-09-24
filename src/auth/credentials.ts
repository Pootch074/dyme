import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

/**
 * A user who can sign in. Passwords are never stored, only a salted hash, so
 * the stored list (or this source file) doesn't give the password away.
 */
export type UserAccount = {
  username: string;
  /** Random hex salt, unique per user. */
  salt: string;
  /** `hashPassword(password, salt)`. */
  passwordHash: string;
  createdAt: string;
};

const USERS_KEY = 'auth-users';
const HASH_ROUNDS = 1000;

/**
 * The initial account, created on first launch. Its hash was made with
 * `hashPassword` (same salt and rounds); the password itself isn't kept here.
 */
const DEFAULT_ACCOUNT: UserAccount = {
  username: 'sacrudyme',
  salt: '16b4146af744cf84f544bfa51c8acebf',
  passwordHash: 'c6720f58af67fac558d63b687a70362b365236fcea557601f591ec302dc0b8a7',
  createdAt: '2026-09-24T00:00:00.000Z',
};

/** Salted SHA-256, repeated so each guess costs more to check. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  let hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`
  );
  for (let round = 1; round < HASH_ROUNDS; round++) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hash);
  }
  return hash;
}

/** Usernames are matched case-insensitively and without surrounding spaces. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Every account that can sign in, seeding the default one on first launch.
 * Adding users or changing passwords later means writing this same list.
 */
export async function loadAccounts(): Promise<UserAccount[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  const parsed: unknown = raw ? JSON.parse(raw) : null;
  if (Array.isArray(parsed) && parsed.length > 0) return parsed as UserAccount[];

  const accounts = [DEFAULT_ACCOUNT];
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(accounts));
  return accounts;
}

/** The account these credentials belong to, or null when either is wrong. */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<UserAccount | null> {
  const wanted = normalizeUsername(username);
  const account = (await loadAccounts()).find(
    (candidate) => normalizeUsername(candidate.username) === wanted
  );
  // Hash even for an unknown username, so both failures take the same time.
  const hash = await hashPassword(password, account?.salt ?? DEFAULT_ACCOUNT.salt);
  return account && hash === account.passwordHash ? account : null;
}

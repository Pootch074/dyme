import 'expo-sqlite/localStorage/install';

/** Where Supabase keeps the signed-in session: a SQLite-backed `localStorage` on Android and iOS. */
export const authStorage: Storage | undefined = localStorage;

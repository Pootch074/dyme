/**
 * Where Supabase keeps the signed-in session: the browser's `localStorage`.
 * Static rendering runs in Node, where there's no storage (and no session to
 * keep), so it's undefined there.
 */
export const authStorage: Storage | undefined =
  typeof window === 'undefined' ? undefined : window.localStorage;

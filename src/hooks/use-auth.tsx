import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAuthApiError, isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';

/** Why a sign-in didn't go through, worded for the Sign in screen. */
export type SignInFailure =
  | 'invalid-credentials'
  | 'email-not-confirmed'
  | 'rate-limited'
  | 'network'
  | 'unknown';

export type SignInResult = { ok: true } | { ok: false; reason: SignInFailure };

type AuthContextValue = {
  /** Email of the signed-in user, or null when signed out. */
  email: string | null;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

/** Keys from the local-only sign-in this app used before Supabase Auth. */
const LEGACY_AUTH_KEYS = ['auth-session', 'auth-users'];

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Tracks the Supabase Auth session. Screens other than Sign in are only
 * reachable while signed in (see the protected routes in app/_layout).
 * Supabase keeps the session in storage and refreshes it, so reopening the
 * app doesn't ask again until the user signs out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) console.warn('Failed to restore sign-in session', error.message);
        if (!cancelled) setSession(data.session);
      })
      .catch((error) => {
        console.warn('Failed to restore sign-in session', error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // Sign in, sign out, token refreshes, and a refresh token that stopped
    // working (which signs the user out) all arrive here.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    AsyncStorage.multiRemove(LEGACY_AUTH_KEYS).catch(() => {});

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (!error) return { ok: true };
    // Only the code is logged: the message can echo what was typed.
    console.warn('Sign in failed', error.code ?? error.name, error.status);
    return { ok: false, reason: signInFailure(error) };
  }, []);

  const signOut = useCallback(async () => {
    // Ends this device's session only. The local session is cleared even when
    // the server can't be reached, so signing out always works.
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) console.warn('Sign out could not reach the server', error.code ?? error.name);
  }, []);

  const value = useMemo(
    () => ({ email: session?.user.email ?? null, isSignedIn: session !== null, signIn, signOut }),
    [session, signIn, signOut]
  );

  // Hold the app until the saved session is read, so a signed-in user never
  // sees the Sign in screen flash. On native the splash screen stays up meanwhile.
  if (isLoading) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function signInFailure(error: unknown): SignInFailure {
  if (isAuthRetryableFetchError(error)) return 'network';
  if (!isAuthApiError(error)) return 'unknown';
  if (error.code === 'invalid_credentials') return 'invalid-credentials';
  if (error.code === 'email_not_confirmed') return 'email-not-confirmed';
  if (error.status === 429) return 'rate-limited';
  return 'unknown';
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { loadAccounts, normalizeUsername, verifyCredentials } from '@/auth/credentials';

/** Remembers who is signed in, so reopening the app doesn't ask again until they sign out. */
const SESSION_KEY = 'auth-session';

type AuthContextValue = {
  /** Username of the signed-in user, or null when signed out. */
  username: string | null;
  isSignedIn: boolean;
  /** Resolves to true on success, false when the username or password is wrong. */
  signIn: (username: string, password: string) => Promise<boolean>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Tracks the signed-in user. Screens other than Sign in are only reachable
 * while signed in (see the protected routes in app/_layout).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // A saved session only counts if its account still exists.
    Promise.all([AsyncStorage.getItem(SESSION_KEY), loadAccounts()])
      .then(([saved, accounts]) => {
        if (cancelled || !saved) return;
        const account = accounts.find(
          (candidate) => normalizeUsername(candidate.username) === normalizeUsername(saved)
        );
        if (account) setUsername(account.username);
      })
      .catch((error) => {
        console.warn('Failed to load sign-in session', error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (name: string, password: string) => {
    const account = await verifyCredentials(name, password);
    if (!account) return false;
    setUsername(account.username);
    AsyncStorage.setItem(SESSION_KEY, account.username).catch((error) => {
      console.warn('Failed to save sign-in session', error);
    });
    return true;
  }, []);

  const signOut = useCallback(() => {
    setUsername(null);
    AsyncStorage.removeItem(SESSION_KEY).catch((error) => {
      console.warn('Failed to clear sign-in session', error);
    });
  }, []);

  const value = useMemo(
    () => ({ username, isSignedIn: username !== null, signIn, signOut }),
    [username, signIn, signOut]
  );

  // Hold the app until the saved session is read, so a signed-in user never
  // sees the Sign in screen flash. On native the splash screen stays up meanwhile.
  if (isLoading) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

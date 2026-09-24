import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

const STORAGE_KEY = 'user-profile';

const EMPTY_PROFILE: Profile = { firstName: '', lastName: '', email: '', phone: '' };

/**
 * Reads a stored profile, upgrading the older shape that kept one `name`
 * field: the last word becomes the last name, everything before it the first
 * name (the user can correct it from the Profile screen).
 */
function parseStoredProfile(parsed: Record<string, unknown>): Profile {
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  const profile: Profile = {
    firstName: text(parsed.firstName),
    lastName: text(parsed.lastName),
    email: text(parsed.email),
    phone: text(parsed.phone),
  };

  const legacyName = text(parsed.name).trim();
  if (legacyName && !profile.firstName && !profile.lastName) {
    const lastSpace = legacyName.lastIndexOf(' ');
    if (lastSpace === -1) {
      profile.firstName = legacyName;
    } else {
      profile.firstName = legacyName.slice(0, lastSpace).trim();
      profile.lastName = legacyName.slice(lastSpace + 1);
    }
  }

  return profile;
}

/** The saved profile, or an empty one (also used by Data Export). */
export async function loadProfile(): Promise<Profile> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed: unknown = raw ? JSON.parse(raw) : null;
  return parsed && typeof parsed === 'object'
    ? parseStoredProfile(parsed as Record<string, unknown>)
    : EMPTY_PROFILE;
}

/** Loads, persists, and updates the user's personal details in AsyncStorage. */
export function useProfile() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadProfile()
      .then((loaded) => {
        if (!cancelled) setProfile(loaded);
      })
      .catch((error) => {
        console.warn('Failed to load profile from storage', error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Skip until the initial load above finishes, so we don't clobber storage
    // with the empty starting state.
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch((error) => {
      console.warn('Failed to save profile to storage', error);
    });
  }, [profile, isLoading]);

  const updateProfile = useCallback((next: Profile) => {
    setProfile(next);
  }, []);

  return { profile, isLoading, updateProfile };
}

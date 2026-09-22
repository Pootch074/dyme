import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type Profile = {
  name: string;
  email: string;
  phone: string;
  employeeNo: string;
  entity: string;
};

const STORAGE_KEY = 'user-profile';

const EMPTY_PROFILE: Profile = { name: '', email: '', phone: '', employeeNo: '', entity: '' };

/** Loads, persists, and updates the user's personal details in AsyncStorage. */
export function useProfile() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') setProfile({ ...EMPTY_PROFILE, ...parsed });
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

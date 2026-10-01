import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { authStorage } from '@/lib/auth-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase is not configured: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.'
  );
}

// No storage means static web rendering in Node: nothing to persist or refresh.
const hasStorage = authStorage !== undefined;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: hasStorage,
    persistSession: hasStorage,
    detectSessionInUrl: false,
  },
});

// The refresh loop only needs to run while the app is in the foreground.
if (hasStorage) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

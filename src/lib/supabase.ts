import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !anonKey) {
  // Fail loudly at startup rather than with a confusing network error later.
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Check .env.local and restart Metro with --clear (env is baked into the bundle).',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // AsyncStorage, not SecureStore: a session can exceed SecureStore's 2KB
    // limit and would silently fail to persist.
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // No URL to parse in a native app.
    detectSessionInUrl: false,
    // PKCE, not implicit: the browser redirect carries a short-lived code
    // rather than the tokens themselves.
    flowType: 'pkce',
  },
});

// Refresh only while the app is in front; a background timer would keep the
// token alive without anyone using it.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

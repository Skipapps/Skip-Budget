import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Check .env.local and restart Metro with --clear (env is baked into the bundle).',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // AsyncStorage, not SecureStore: a session can exceed SecureStore's 2KB limit and silently
    // fail to persist.
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // PKCE, not implicit: the browser redirect carries a short-lived code, not the tokens.
    flowType: 'pkce',
  },
});

// Refresh only while the app is in front.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

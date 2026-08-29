import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { setHapticsEnabled } from '@/lib/haptics';

/**
 * The switches in Settings that are about this phone rather than this account.
 *
 * Haptics and the app lock both describe the device someone is holding — a
 * shared iPad should not inherit the Face ID lock from the phone, and a phone
 * with the taptic engine turned off system-wide has nothing to sync. So they
 * live in local storage beside the theme rather than on the profile.
 */

const HAPTICS_KEY = 'skip.prefs.haptics';
const LOCK_KEY = 'skip.prefs.appLock';

type PreferencesValue = {
  haptics: boolean;
  appLock: boolean;
  setHaptics: (on: boolean) => void;
  setAppLock: (on: boolean) => void;
  ready: boolean;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [haptics, setHapticsState] = useState(true);
  const [appLock, setAppLockState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.multiGet([HAPTICS_KEY, LOCK_KEY]);
        if (cancelled) return;
        const map = Object.fromEntries(stored);
        // Haptics default to on, so only an explicit "false" turns them off.
        if (map[HAPTICS_KEY] === 'false') {
          setHapticsState(false);
          setHapticsEnabled(false);
        }
        if (map[LOCK_KEY] === 'true') setAppLockState(true);
      } catch {
        // Defaults are a working app; there is nothing to recover.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setHaptics = useCallback((on: boolean) => {
    setHapticsState(on);
    // Straight to the module the buttons read, so the very next press is right.
    setHapticsEnabled(on);
    AsyncStorage.setItem(HAPTICS_KEY, String(on)).catch(() => {});
  }, []);

  const setAppLock = useCallback((on: boolean) => {
    setAppLockState(on);
    AsyncStorage.setItem(LOCK_KEY, String(on)).catch(() => {});
  }, []);

  const value = useMemo<PreferencesValue>(
    () => ({ haptics, appLock, setHaptics, setAppLock, ready }),
    [haptics, appLock, setHaptics, setAppLock, ready],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside a PreferencesProvider');
  return value;
}

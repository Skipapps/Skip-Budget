import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { vars } from 'nativewind';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme, View } from 'react-native';

import { buildTokens, tokenVars, type ModeKey, type Scheme, type Tokens } from '@/theme/palette';

/**
 * Every className names a token (`bg-card`, `text-ink`) and tokens are CSS variables, so repainting
 * is setting the variables on one View. `useColors()` covers what a className cannot reach: icon
 * props and SVG fills. The mode is stored on the device, not the profile: the default belongs to
 * the phone, and reading it locally makes the first frame the right colour.
 */

const MODE_KEY = 'skip.theme.mode';

type ThemeValue = {
  mode: ModeKey;
  /** What `mode` actually resolves to right now. */
  scheme: Scheme;
  colors: Tokens;
  setMode: (mode: ModeKey) => void;
  /** False until the stored choice has been read. */
  ready: boolean;
};

const ThemeContext = createContext<ThemeValue | null>(null);

const isMode = (value: string | null): value is ModeKey =>
  value === 'light' || value === 'dark' || value === 'system';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // react-native's, not nativewind's: the phone's setting is only an input here.
  const phone = useColorScheme();

  const [mode, setModeState] = useState<ModeKey>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(MODE_KEY)
      .then((stored) => {
        if (!cancelled && isMode(stored)) setModeState(stored);
      })
      // Unreadable storage still gets an app, following the phone.
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scheme: Scheme = mode === 'system' ? (phone === 'dark' ? 'dark' : 'light') : mode;
  const colors = useMemo(() => buildTokens(scheme), [scheme]);

  // Behind the app itself: shows through during navigation transitions and under the keyboard, and
  // would stay white in dark mode.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.surface).catch(() => {});
  }, [colors.surface]);

  const setMode = useCallback((next: ModeKey) => {
    setModeState(next);
    AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({ mode, scheme, colors, setMode, ready }),
    [mode, scheme, colors, setMode, ready],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, vars(tokenVars(colors))]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside a ThemeProvider');
  return value;
}

/** Resolved colours for what a className cannot reach: icon props, SVG fills, native options. */
export function useColors(): Tokens {
  return useTheme().colors;
}

/** Colour for a signed amount; a hook because the money pair differs per scheme. */
export function useMoneyColor(): (amount: number) => string {
  const colors = useColors();
  return useCallback(
    (amount: number) => {
      if (amount > 0) return colors.moneyIn;
      if (amount < 0) return colors.moneyOut;
      // Zero is plain ink. Returned explicitly rather than undefined: `{ color: undefined }` in a
      // style prop still overrides the className colour when React Native flattens styles.
      return colors.ink;
    },
    [colors],
  );
}

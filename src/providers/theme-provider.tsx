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
 * One place that decides what colour the app is.
 *
 * Every className in Skip already names a token — `bg-card`, `text-ink`,
 * `bg-control` — and those tokens are CSS variables. So repainting the app is
 * setting thirteen variables on one View rather than re-rendering a thousand
 * styles: the whole tree picks up the new values because it was never told the
 * old ones. `useColors()` covers the rest, the places a className cannot reach
 * — icon props and SVG fills.
 *
 * There is one theme; the only choice is light, dark, or follow the phone.
 * That choice is kept on the device rather than in the profile, because the
 * default is a property of the phone and not of the account, and reading it
 * locally means the first frame is already the right colour.
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
  // react-native's, not nativewind's: the phone's setting is an input here,
  // not the answer. When the mode is light or dark this is ignored entirely.
  const phone = useColorScheme();

  const [mode, setModeState] = useState<ModeKey>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(MODE_KEY)
      .then((stored) => {
        if (!cancelled && isMode(stored)) setModeState(stored);
      })
      // A device that cannot read its own storage still gets an app, following
      // the phone.
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

  // Behind the app itself: what shows through during a navigation transition
  // and under the keyboard. Left as it was, that stays white in dark mode.
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

/**
 * The resolved colours, for the places a className cannot reach.
 *
 * Icon `color` props, SVG fills and native component options all want a raw
 * string. Everything else should stay on its Tailwind class, which follows the
 * theme on its own.
 */
export function useColors(): Tokens {
  return useTheme().colors;
}

/**
 * The colour for a signed amount, in the current scheme.
 *
 * A hook rather than a plain function because the pair is not fixed: the deep
 * green that reads on off-white disappears on near-black, so dark mode carries
 * its own. Call sites are unchanged — they still ask for a colour by amount.
 */
export function useMoneyColor(): (amount: number) => string {
  const colors = useColors();
  return useCallback(
    (amount: number) => {
      if (amount > 0) return colors.moneyIn;
      if (amount < 0) return colors.moneyOut;
      // Zero is neither good news nor bad: plain ink. Returned explicitly
      // rather than as undefined, because `{ color: undefined }` in a style
      // prop still overrides the className colour when React Native flattens
      // styles — which is how "$0.00" came out black on the dark theme.
      return colors.ink;
    },
    [colors],
  );
}

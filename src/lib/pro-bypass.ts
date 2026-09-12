import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * A development-only switch that makes the app answer "yes, this account is
 * Pro" without anybody buying anything.
 *
 * It exists so the testing team can open Appearance, Insights, Splits and the
 * loan screens on a simulator. It overrides one thing and one thing only: the
 * entitlement *read* in `usePro()`. Offerings, purchases and restore are
 * untouched, so a real purchase on a real build still behaves exactly as it
 * did — this file cannot make somebody Pro on the server, only in the UI of a
 * debug bundle on the tester's own phone.
 *
 * Two locks, and the first is the one that matters:
 *
 * 1. `__DEV__`. Every entry point below returns before it looks at anything
 *    else unless `__DEV__` is true. React Native's Xcode build phase passes
 *    `--dev false` for every configuration that is not Debug
 *    (`react-native-xcode.sh`), and `expo export` does the same, so in any
 *    Release build `__DEV__` is the literal `false` and none of this can run
 *    however the storage key or the env var are set.
 * 2. An explicit opt-in: either `EXPO_PUBLIC_PRO_BYPASS=1` in `.env.local`
 *    (inlined by Metro at bundle time — see the Expo environment-variables
 *    guide) or the Settings switch that only renders under `__DEV__`. The
 *    switch is there so a tester can flip it on a running simulator without
 *    waiting for a rebuild; the env var is there so an automated run can start
 *    in the bypassed state.
 *
 * Nothing here is a secret and nothing here reaches the database. A tester
 * with the bypass on is a free account that the client is *drawing* as Pro;
 * any server-side check still sees the truth.
 */

/** Namespaced like the other local switches, and obvious in a storage dump. */
export const PRO_BYPASS_KEY = 'skip.dev.proBypass';

/** The stored toggle, once read back. Meaningless unless `__DEV__`. */
let toggled = false;
let hydrated = false;
const listeners = new Set<() => void>();

/**
 * The env opt-in.
 *
 * Written as a direct `process.env.EXPO_PUBLIC_…` property read because that
 * is the only form Expo's Metro config inlines; a destructure or a bracket
 * lookup would silently be `undefined` in a bundle.
 */
function envOptIn(): boolean {
  return process.env.EXPO_PUBLIC_PRO_BYPASS === '1';
}

function announce(source: string): void {
  console.warn(
    `⚠️  PRO BYPASS IS ON (${source}). usePro() is reporting pro=true without a subscription. ` +
      `Development builds only — this cannot run in Release. Nothing was purchased and no ` +
      `entitlement exists on the server.`,
  );
}

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * True when the app should pretend this account is Pro.
 *
 * Read at call time rather than captured at import, so flipping the switch
 * takes effect on the next render instead of the next launch.
 */
export function proBypassActive(): boolean {
  if (!__DEV__) return false;
  return toggled || envOptIn();
}

/** Flips the switch and remembers it. A no-op outside a development build. */
export function setProBypass(on: boolean): void {
  if (!__DEV__) return;
  if (toggled === on) return;
  toggled = on;
  if (on) announce('Settings switch');
  // Fire-and-forget: the in-memory value is what the UI reads, and a storage
  // failure on a dev build is not worth an error path.
  const write = on
    ? AsyncStorage.setItem(PRO_BYPASS_KEY, 'true')
    : AsyncStorage.removeItem(PRO_BYPASS_KEY);
  write.catch(() => {});
  emit();
}

/** Reads the remembered switch back, once per launch. */
export function hydrateProBypass(): void {
  if (!__DEV__ || hydrated) return;
  hydrated = true;
  AsyncStorage.getItem(PRO_BYPASS_KEY)
    .then((stored) => {
      if (stored !== 'true' || toggled) return;
      toggled = true;
      announce('saved from a previous run');
      emit();
    })
    .catch(() => {});
}

function subscribe(listener: () => void): () => void {
  hydrateProBypass();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The hook form, for `usePro()` and the Settings switch. */
export function useProBypass(): boolean {
  return useSyncExternalStore(subscribe, proBypassActive, () => false);
}

// One warning at launch when the env var did the opt-in, so a bypassed bundle
// says so in the log before any screen renders.
if (__DEV__ && envOptIn()) announce('EXPO_PUBLIC_PRO_BYPASS=1');

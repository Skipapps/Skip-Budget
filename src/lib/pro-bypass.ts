import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * A development-only override for what `usePro()` answers.
 *
 * Three positions instead of the old on/off, because testers need both lies:
 *
 *   'off'   the truth — RevenueCat, then the server row, as shipped.
 *   'pro'   draw this account as Pro without anybody buying anything.
 *   'free'  draw this account as free even when a sandbox purchase or a
 *           dashboard grant says otherwise. This is the one that makes the
 *           free and lapsed experiences testable at all: a RevenueCat
 *           entitlement cannot be switched off from inside the app, so
 *           without it one sandbox buy would leave a device Pro forever.
 *
 * It overrides one thing and one thing only: the entitlement *read* in
 * `usePro()`. Offerings, purchases, restore and every server-side check are
 * untouched — the database still sees the truth, so a 'pro' override still
 * cannot write past the free allowance. See 0007: the client is convenience,
 * the database is the wall.
 *
 * Two locks, and the first is the one that matters:
 *
 * 1. `__DEV__`. Every entry point below returns 'off' before it looks at
 *    anything else unless `__DEV__` is true. React Native's Xcode build phase
 *    passes `--dev false` for every configuration that is not Debug, and
 *    `expo export` does the same, so in any Release build `__DEV__` is the
 *    literal `false` and none of this can run however the storage key or the
 *    env var are set.
 * 2. An explicit opt-in: either `EXPO_PUBLIC_PRO_BYPASS=1` in `.env.local`
 *    (inlined by Metro at bundle time; counts as 'pro') or the Settings
 *    switches that only render under `__DEV__`.
 */

export type ProOverride = 'off' | 'pro' | 'free';

/** Namespaced like the other local switches, and obvious in a storage dump. */
export const PRO_BYPASS_KEY = 'skip.dev.proBypass';

/** The stored position, once read back. Meaningless unless `__DEV__`. */
let stored: ProOverride = 'off';
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

function announce(position: ProOverride, source: string): void {
  console.warn(
    position === 'pro'
      ? `⚠️  PRO OVERRIDE IS ON (${source}). usePro() is reporting pro=true without a ` +
          `subscription. Development builds only — nothing was purchased and no entitlement ` +
          `exists on the server.`
      : `⚠️  FREE OVERRIDE IS ON (${source}). usePro() is reporting pro=false whatever ` +
          `RevenueCat or the server say. Development builds only.`,
  );
}

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * The position in force. Read at call time rather than captured at import,
 * so flipping a switch takes effect on the next render instead of the next
 * launch. The stored position wins; the env var only fills in when nothing
 * was chosen by hand, so a tester can still force 'free' on an automated run.
 */
export function proOverride(): ProOverride {
  if (!__DEV__) return 'off';
  if (stored !== 'off') return stored;
  return envOptIn() ? 'pro' : 'off';
}

/** Moves the switch and remembers it. A no-op outside a development build. */
export function setProOverride(next: ProOverride): void {
  if (!__DEV__) return;
  if (stored === next) return;
  stored = next;
  if (next !== 'off') announce(next, 'Settings switch');
  // Fire-and-forget: the in-memory value is what the UI reads, and a storage
  // failure on a dev build is not worth an error path.
  const write =
    next === 'off'
      ? AsyncStorage.removeItem(PRO_BYPASS_KEY)
      : AsyncStorage.setItem(PRO_BYPASS_KEY, next);
  write.catch(() => {});
  emit();
}

/** Reads the remembered position back, once per launch. */
export function hydrateProBypass(): void {
  if (!__DEV__ || hydrated) return;
  hydrated = true;
  AsyncStorage.getItem(PRO_BYPASS_KEY)
    .then((value) => {
      if (stored !== 'off') return;
      // 'true' is what the old on/off switch wrote; it meant 'pro'.
      const position: ProOverride =
        value === 'pro' || value === 'true' ? 'pro' : value === 'free' ? 'free' : 'off';
      if (position === 'off') return;
      stored = position;
      announce(position, 'saved from a previous run');
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

/** The hook form, for `usePro()` and the Settings switches. */
export function useProOverride(): ProOverride {
  return useSyncExternalStore(subscribe, proOverride, () => 'off' as const);
}

// One warning at launch when the env var did the opt-in, so a bypassed bundle
// says so in the log before any screen renders.
if (__DEV__ && envOptIn()) announce('pro', 'EXPO_PUBLIC_PRO_BYPASS=1');

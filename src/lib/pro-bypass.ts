import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * A development-only override for what `usePro()` answers.
 *
 *   'off'   the truth: RevenueCat, then the server row.
 *   'pro'   draw this account as Pro without a purchase.
 *   'free'  draw this account as free even with a sandbox purchase or dashboard grant. Needed
 *           because a RevenueCat entitlement cannot be switched off from inside the app.
 *
 * It overrides only the entitlement read in `usePro()`. Offerings, purchases, restore and every
 * server-side check are untouched, so a 'pro' override still cannot write past the free allowance:
 * the client is convenience, the database is the wall.
 *
 * Two locks, and the first is the one that matters:
 *
 * 1. `__DEV__`. Every entry point returns 'off' unless it is true. Xcode's build phase and
 *    `expo export` pass `--dev false` for every non-Debug build, so in Release none of this can
 *    run however the storage key or env var are set.
 * 2. An explicit opt-in: `EXPO_PUBLIC_PRO_BYPASS=1` in `.env.local` (counts as 'pro') or the
 *    Settings switches, which only render under `__DEV__`.
 */

export type ProOverride = 'off' | 'pro' | 'free';

const PRO_BYPASS_KEY = 'skip.dev.proBypass';

/** The stored position once read back. Meaningless unless `__DEV__`. */
let stored: ProOverride = 'off';
let hydrated = false;
const listeners = new Set<() => void>();

/**
 * Must stay a direct `process.env.EXPO_PUBLIC_…` property read: it is the only form Metro inlines,
 * and a destructure or bracket lookup is silently `undefined` in a bundle.
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
 * The position in force, read at call time so a switch takes effect on the next render. The stored
 * position wins; the env var only fills in when nothing was chosen by hand.
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
  // Fire-and-forget: the UI reads the in-memory value.
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
      // 'true' is a legacy stored value meaning 'pro'.
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

// Warn at launch when the env var did the opt-in, before any screen renders.
if (__DEV__ && envOptIn()) announce('pro', 'EXPO_PUBLIC_PRO_BYPASS=1');

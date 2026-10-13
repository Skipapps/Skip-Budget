import { useCallback, useEffect, useRef, useState } from 'react';

import { usePro } from '@/api/pro';
import { withTimeout } from '@/lib/deadline';
import { proStatus } from '@/lib/pro-status';
import { refusedForPro } from '@/lib/pro-refusal';

/**
 * When the database refuses a Pro write that the app allowed. The app takes RevenueCat's yes at
 * once; the database only believes the `entitlements` row, which the webhook writes later, and
 * not at all for a purchase moved between accounts. So the two are asked again before anything is
 * said: the store past its cache, then the database for a few seconds.
 *
 *   'pro'      the database agrees now, so the write can go again.
 *   'free'     the store says free after all, and the app has caught up: show what Pro adds.
 *   'unknown'  still no agreement: the write's own failure stands.
 */
export type ProAnswer = 'pro' | 'free' | 'unknown';

export type ConfirmProDeps = {
  /** The store's answer read past its cache; null when it cannot say. */
  storeSaysPro: () => Promise<boolean | null>;
  /** The database's answer for the signed-in account, the one its walls ask. */
  serverSaysPro: () => Promise<boolean>;
  /** What the app shows right now. */
  appSaysPro: () => boolean;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

/** How long the database gets to agree: the webhook usually lands within a few seconds. */
export const SERVER_WAIT_MS = 10_000;
const SERVER_POLL_MS = 1_000;
/** How long the app gets to take in a "free" from the store before the explainer is shown. */
export const APP_CATCH_UP_MS = 3_000;
const APP_POLL_MS = 250;
const ASK_TIMEOUT_MS = 4_000;

/** The entitlement ids `usePro()` accepts (pro.ts `proFrom`); keep the two lists alike. */
const PRO_ENTITLEMENTS = ['pro', 'skip_budget_pro'];

/**
 * The client, required only when asked, so the pages that use this module load no client of their
 * own (and their tests need not stand one up).
 */
function client() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@/lib/supabase') as typeof import('@/lib/supabase')).supabase;
}

async function signedInId(): Promise<string | null> {
  const { data } = await client().auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * RevenueCat's answer for the signed-in account, read past its cache; null with no store, when it
 * cannot say, or when the answer is another account's.
 */
export async function storeSaysPro(): Promise<boolean | null> {
  // A direct property read: the only form Metro inlines.
  if (!process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY) return null;
  try {
    const userId = await signedInId();
    if (!userId) return null;
    // Required here, as the client is.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const store = require('react-native-purchases') as typeof import('react-native-purchases');
    const Purchases = store.default;
    if (!(await Purchases.isConfigured())) return null;
    await Purchases.invalidateCustomerInfoCache();
    const info = await withTimeout(
      Purchases.getCustomerInfo(),
      ASK_TIMEOUT_MS,
      'The store did not answer.',
    );
    // The store still signed in as the account before says nothing about this one (pro.ts `isFor`).
    if (info.originalAppUserId !== userId) return null;
    return PRO_ENTITLEMENTS.some((id) => Boolean(info.entitlements.active[id]));
  } catch {
    return null;
  }
}

/** `is_pro()` for the signed-in account: what the database's walls ask. */
export async function serverSaysPro(): Promise<boolean> {
  const userId = await signedInId();
  if (!userId) return false;
  const { data, error } = await withTimeout(
    Promise.resolve(client().rpc('is_pro', { p_user: userId })),
    ASK_TIMEOUT_MS,
    'Could not check Skip Pro.',
  );
  if (error) throw error;
  return data === true;
}

const DEFAULT_DEPS: ConfirmProDeps = {
  storeSaysPro,
  serverSaysPro,
  appSaysPro: () => proStatus().pro,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

/** Asks again whether the database will take a Pro write; see `ProAnswer`. */
export async function confirmPro(deps: ConfirmProDeps = DEFAULT_DEPS): Promise<ProAnswer> {
  const started = deps.now();

  const server = async () => {
    try {
      return await deps.serverSaysPro();
    } catch {
      // An unanswered check is not a no; the next one may get through.
      return false;
    }
  };

  // The webhook may have landed since the refusal.
  if (await server()) return 'pro';

  if ((await deps.storeSaysPro()) === false) {
    // The store's listener republishes the answer. Until the app shows free, the explainer would
    // turn straight back to this page, so it waits for that.
    while (deps.now() - started < APP_CATCH_UP_MS) {
      if (!deps.appSaysPro()) return 'free';
      await deps.sleep(APP_POLL_MS);
    }
    return deps.appSaysPro() ? 'unknown' : 'free';
  }

  while (deps.now() - started < SERVER_WAIT_MS) {
    await deps.sleep(SERVER_POLL_MS);
    if (await server()) return 'pro';
  }
  return 'unknown';
}

export type ProWrite<T> =
  | { status: 'saved'; value: T }
  /** The account is free after all: show what Pro adds. */
  | { status: 'free' }
  /** The page was left while it waited; nothing was written again and nothing is left to show. */
  | { status: 'left' };

/**
 * Runs a write that the database's Pro wall may refuse. A refusal for someone the app shows as
 * free resolves 'free'. For someone it shows as Pro, `checking` is on while `confirmPro` asks
 * again, then the write goes once more if the database agrees. Anything else rejects as the write
 * did, so the page says the one failure line.
 */
export function useProWrite(confirm: () => Promise<ProAnswer> = confirmPro) {
  const { pro } = usePro();
  const [checking, setChecking] = useState(false);

  // Read when the refusal arrives, not when Save was pressed.
  const proNow = useRef(pro);
  const mounted = useRef(true);
  useEffect(() => {
    proNow.current = pro;
  }, [pro]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async <T>(write: () => Promise<T>): Promise<ProWrite<T>> => {
      try {
        return { status: 'saved', value: await write() };
      } catch (thrown) {
        if (!refusedForPro(thrown)) throw thrown;
        // A page already left must not open the explainer: it would sit over wherever the person is.
        if (!mounted.current) return { status: 'left' };
        if (!proNow.current) return { status: 'free' };

        setChecking(true);
        let answer: ProAnswer;
        try {
          answer = await confirm();
        } finally {
          if (mounted.current) setChecking(false);
        }
        if (!mounted.current) return { status: 'left' };
        if (answer === 'free') return { status: 'free' };
        if (answer === 'unknown') throw thrown;
        return { status: 'saved', value: await write() };
      }
    },
    [confirm],
  );

  return { run, checking };
}

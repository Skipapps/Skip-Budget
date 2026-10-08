import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

import { t } from '@/i18n';
import { withTimeout } from '@/lib/deadline';
import { useProOverride } from '@/lib/pro-bypass';
import { publishProStatus, useProStatus, type ProStatus } from '@/lib/pro-status';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * The one door to "does this account pay". RevenueCat's SDK knows the moment Apple's sheet closes
 * and caches its answer offline; the `entitlements` row is the server's copy, written by the
 * webhook and read by every database check. The hook prefers the SDK and falls back to the row, so
 * it works with no key configured. Nothing else imports react-native-purchases; features ask
 * `usePro()`.
 *
 * The answer is worked out once, by the purchases bridge at the root, and published to a shared
 * store; `usePro()` only reads that store, so it is cheap enough to call from every row of a list.
 */

const RC_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

/** How long the server's copy may take before it counts as unanswered (and free is assumed). */
const ENTITLEMENT_TIMEOUT_MS = 8_000;

let configuredFor: string | null = null;
let configuring: Promise<boolean> | null = null;
/** Why configure last failed, surfaced rather than guessed at. */
let lastConfigureError: string | null = null;

/**
 * Configure exactly once, and make every SDK caller wait for it. Touching the SDK before configure
 * succeeds throws "no singleton instance", so nobody talks to it until this resolves true; a
 * failure is retried on the next call, and setLogLevel runs after configure so it cannot abort it.
 */
function ensureConfigured(userId: string): Promise<boolean> {
  if (!RC_KEY) return Promise.resolve(false);
  if (configuredFor === userId) return Promise.resolve(true);

  if (!configuring) {
    configuring = (async () => {
      // Two attempts: the first native call of a launch can race bridge start-up, and one retry
      // separates a transient stumble from a real fault.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          if (configuredFor === null) {
            Purchases.configure({ apiKey: RC_KEY, appUserID: userId });
            try {
              Purchases.setLogLevel(LOG_LEVEL.WARN);
            } catch {
              // Log verbosity is not worth failing configuration over.
            }
          } else {
            await Purchases.logIn(userId);
          }
          configuredFor = userId;
          lastConfigureError = null;
          configuring = null;
          return true;
        } catch (thrown) {
          lastConfigureError = (thrown as Error).message || String(thrown);
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
      configuring = null;
      return false;
    })();
  }
  return configuring;
}

/** True on real hardware with a key present — the only case purchases work. */
export function purchasesAvailable(): boolean {
  return RC_KEY.length > 0;
}

function proFrom(info: CustomerInfo | null): boolean {
  // Either identifier counts (the dashboard entitlement is skip_budget_pro, the plan said pro), so
  // a rename can never lock out paying customers.
  return Boolean(info?.entitlements.active['pro'] || info?.entitlements.active['skip_budget_pro']);
}

/**
 * Signs RevenueCat in as the Supabase user, once per account. The Supabase id is the RevenueCat app
 * user id, so the entitlement follows the account across reinstalls and devices and the webhook
 * writes the right row without a mapping table.
 */
export function useConfigurePurchases(): void {
  const userId = useUserId();

  useEffect(() => {
    if (userId) void ensureConfigured(userId);
  }, [userId]);

  const { pro, ready } = useProSource();
  useEffect(() => {
    publishProStatus({ pro, ready });
  }, [pro, ready]);
}

/** Whether this account pays, as the purchases bridge last worked it out. */
export function usePro(): ProStatus {
  return useProStatus();
}

/**
 * Works the answer out: the SDK listener, the server row and the development override. Runs once,
 * in the purchases bridge; everything else reads the published result through `usePro()`.
 */
export function useProSource(): ProStatus {
  const userId = useUserId();
  const client = useQueryClient();
  // Remembered with the account it belongs to, so after a sign-out the next account never inherits
  // the previous one's answer while its own is on the way.
  const [sdk, setSdk] = useState<{ userId: string; pro: boolean } | null>(null);
  const sdkPro = sdk && sdk.userId === userId ? sdk.pro : null;
  // Development-only, opt-in. It changes the answer below and nothing else: the SDK listener,
  // server query, offerings, purchase and restore still run. 'free' exists because a sandbox
  // purchase or dashboard grant cannot be switched off in-app, yet the free and lapsed experiences
  // must be testable. See src/lib/pro-bypass.ts for the two locks.
  const override = useProOverride();

  // The server's copy — also the only copy when no key is configured.
  const server = useQuery({
    queryKey: ['entitlement', userId],
    enabled: Boolean(userId),
    // One attempt: until it answers, a free account's gates wait. A purchase and every return to the
    // app read it again anyway.
    retry: false,
    queryFn: async (): Promise<boolean> => {
      // A ceiling on the wait: until this answers (or fails), a "no" from the SDK alone does not
      // count as known, so a hung request would hold every gate.
      const { data, error } = await withTimeout(
        Promise.resolve(supabase.from('entitlements').select('pro, expires_at').maybeSingle()),
        ENTITLEMENT_TIMEOUT_MS,
        'Could not check Skip Pro.',
      );
      if (error) throw error;
      if (!data?.pro) return false;
      return !data.expires_at || new Date(data.expires_at).getTime() > Date.now();
    },
  });

  useEffect(() => {
    if (!RC_KEY || !userId) return;
    let live = true;
    let listening = false;

    const listener = (info: CustomerInfo) => {
      if (!live) return;
      setSdk({ userId, pro: proFrom(info) });
      // The SDK heard it first; the server row lands via webhook later. Refetching keeps them
      // agreeing.
      client.invalidateQueries({ queryKey: ['entitlement'] });
    };

    // Everything waits behind the configure gate; touching the SDK earlier gives "no singleton
    // instance".
    void (async () => {
      if (!(await ensureConfigured(userId)) || !live) return;
      Purchases.addCustomerInfoUpdateListener(listener);
      listening = true;
      try {
        const info = await Purchases.getCustomerInfo();
        if (live) setSdk({ userId, pro: proFrom(info) });
      } catch {
        // The server row still answers.
      }
    })();

    return () => {
      live = false;
      if (listening) Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [userId, client]);

  return {
    // Either source saying yes is yes: the SDK knows a purchase before the
    // webhook lands, and the row knows a restore made on another device.
    // An override outranks both, in whichever direction it points.
    pro:
      override === 'free' ? false : override === 'pro' || sdkPro === true || server.data === true,
    // Ready means "safe to show a gate": a yes from either source, or the server's answer. A no
    // from the SDK alone waits for the row, which knows a grant or a purchase made elsewhere, so a
    // payer never sees the free version flash. An override is ready by definition.
    ready: override !== 'off' || sdkPro === true || server.isFetched,
  };
}

export type ProPrices = {
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
  /**
   * The free introductory period each plan offers this person: null when the plan has none or they
   * have used theirs. Only a confirmed yes counts, so nobody is promised a trial Apple will not give.
   */
  trials: { monthly: TrialPeriod | null; yearly: TrialPeriod | null };
  /** Why the store came back the way it did — shown while debugging billing. */
  debug: string;
};

/** A free introductory period as the store describes it: a number of DAY, WEEK, MONTH or YEAR. */
export type TrialPeriod = { count: number; unit: string };

const PERIOD_KEYS = {
  DAY: 'pro.period.day',
  MONTH: 'pro.period.month',
  YEAR: 'pro.period.year',
} as const;

/**
 * "14 days" in the language on screen. Weeks are told in days: App Store Connect offers "2 weeks",
 * and the page promises "14 days".
 */
export function trialPeriodLabel({ count, unit }: TrialPeriod): string {
  if (unit.toUpperCase() === 'WEEK') return t('pro.period.day', { count: count * 7 });
  const key = PERIOD_KEYS[unit.toUpperCase() as keyof typeof PERIOD_KEYS];
  if (key) return t(key, { count });
  return `${count} ${unit.toLowerCase()}${count === 1 ? '' : 's'}`;
}

/** The plan's free intro period, when it has one and this person may still take it. */
function trialFor(
  pack: PurchasesPackage | null,
  eligible: ReadonlySet<string>,
): TrialPeriod | null {
  const intro = pack?.product.introPrice;
  if (!pack || !intro || intro.price !== 0 || !eligible.has(pack.product.identifier)) return null;
  return { count: intro.periodNumberOfUnits, unit: intro.periodUnit };
}

/** The live prices, straight from the store — never hardcoded when buyable. */
export function useProPrices() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['pro-prices', userId],
    enabled: purchasesAvailable() && Boolean(userId),
    queryFn: async (): Promise<ProPrices> => {
      if (!(await ensureConfigured(userId!))) {
        throw new Error(
          lastConfigureError
            ? `could not start — ${lastConfigureError}`
            : 'could not start, with no reason given.',
        );
      }
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      const monthly = current?.monthly ?? null;
      const yearly = current?.annual ?? null;

      // With no packages, ask StoreKit for the products by id: products but no packages is a
      // RevenueCat offering-linkage problem; zero products means the sandbox serves nothing here.
      let debug = `offerings=${Object.keys(offerings.all).length} current=${current ? 'yes' : 'none'} pkgs=${current?.availablePackages.length ?? 0}`;
      if (!monthly && !yearly) {
        try {
          const products = await Purchases.getProducts([
            'skip_budget_pro_monthly',
            'skip_budget_pro_yearly',
          ]);
          debug += ` direct=${products.length}`;
        } catch (thrown) {
          debug += ` fetchErr=${(thrown as Error).message}`;
        }
      }

      // A trial is offered once per subscription group. Unknown (or a failed check) shows the
      // ordinary price, as RevenueCat advises: a trial promised and then refused at the sheet is
      // worse than one discovered there.
      const eligible = new Set<string>();
      const ids = [monthly, yearly].flatMap((pack) => (pack ? [pack.product.identifier] : []));
      if (ids.length > 0) {
        try {
          const answer = await Purchases.checkTrialOrIntroductoryPriceEligibility(ids);
          const yes = Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
          for (const id of ids) if (answer[id]?.status === yes) eligible.add(id);
        } catch (thrown) {
          debug += ` trialErr=${(thrown as Error).message}`;
        }
      }

      return {
        monthly,
        yearly,
        trials: { monthly: trialFor(monthly, eligible), yearly: trialFor(yearly, eligible) },
        debug,
      };
    },
  });
}

/** The RevenueCat offering that holds the one-time offer's product. */
const EXIT_OFFERING = 'exit_offer';

export type OfferPrices = {
  /** The one-time yearly plan; null when the store has no such offering, and then no offer shows. */
  offer: PurchasesPackage | null;
  /** The ordinary yearly plan, drawn struck through beside it. */
  regular: PurchasesPackage | null;
};

/** The one-time offer's plan and the ordinary yearly one, straight from the store. */
export function useOfferPrices() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['pro-offer-prices', userId],
    enabled: purchasesAvailable() && Boolean(userId),
    queryFn: async (): Promise<OfferPrices> => {
      if (!(await ensureConfigured(userId!))) {
        throw new Error(lastConfigureError ?? 'could not start, with no reason given.');
      }
      const offerings = await Purchases.getOfferings();
      const exit = offerings.all[EXIT_OFFERING];
      return {
        offer: exit?.annual ?? exit?.availablePackages[0] ?? null,
        regular: offerings.current?.annual ?? null,
      };
    },
  });
}

export function usePurchasePro() {
  const client = useQueryClient();
  const userId = useUserId();

  const purchase = useCallback(
    async (pack: PurchasesPackage): Promise<'done' | 'cancelled'> => {
      try {
        if (!userId || !(await ensureConfigured(userId))) {
          throw new Error(
            lastConfigureError ?? 'Purchases are not ready yet — try again in a moment.',
          );
        }
        await Purchases.purchasePackage(pack);
        client.invalidateQueries({ queryKey: ['entitlement'] });
        return 'done';
      } catch (thrown) {
        if ((thrown as { userCancelled?: boolean }).userCancelled) return 'cancelled';
        throw thrown;
      }
    },
    [client, userId],
  );

  const restore = useCallback(async (): Promise<boolean> => {
    if (!userId || !(await ensureConfigured(userId))) {
      throw new Error(lastConfigureError ?? 'Purchases are not ready yet — try again in a moment.');
    }
    const info = await Purchases.restorePurchases();
    client.invalidateQueries({ queryKey: ['entitlement'] });
    return proFrom(info);
  }, [client, userId]);

  return { purchase, restore };
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * The one door to "does this account pay".
 *
 * Two sources agree on the answer. RevenueCat's SDK knows the moment Apple's
 * sheet closes and caches its answer offline; the `entitlements` row is the
 * server's copy, written by the webhook, and what every database check reads.
 * The hook prefers the SDK and falls back to the row — so the app keeps its
 * answer with no key configured at all, which is what lets every gate ship
 * before the App Store side exists.
 *
 * Nothing else in the app imports react-native-purchases. Features ask
 * `usePro()` and render; billing stays in this file. That separation is the
 * stability promise: removing the whole paywall later is deleting gates, not
 * surgery.
 */

const RC_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

let configuredFor: string | null = null;
let configuring: Promise<boolean> | null = null;

/**
 * Configure exactly once, and make every SDK caller wait for it.
 *
 * The first version configured in a fire-and-forget effect and swallowed any
 * failure — so one early throw (setLogLevel before configure, as it turned
 * out) silently left the SDK unconfigured forever, and every later call died
 * with "no singleton instance" while the app showed no reason why. Now there
 * is one gate: nobody talks to the SDK until this resolves true, a failure is
 * retried on the next call instead of remembered forever, and setLogLevel
 * runs after configure, where it cannot abort it.
 */
function ensureConfigured(userId: string): Promise<boolean> {
  if (!RC_KEY) return Promise.resolve(false);
  if (configuredFor === userId) return Promise.resolve(true);

  if (!configuring) {
    configuring = (async () => {
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
        return true;
      } catch (thrown) {
        console.warn('Purchases configure failed', (thrown as Error).message);
        return false;
      } finally {
        configuring = null;
      }
    })();
  }
  return configuring;
}

/** True on real hardware with a key present — the only case purchases work. */
export function purchasesAvailable(): boolean {
  return RC_KEY.length > 0;
}

function proFrom(info: CustomerInfo | null): boolean {
  // Either identifier counts. The dashboard was set up as skip_budget_pro
  // while the plan said pro; accepting both means a rename there can never
  // silently lock out paying customers.
  return Boolean(info?.entitlements.active['pro'] || info?.entitlements.active['skip_budget_pro']);
}

/**
 * Signs RevenueCat in as the Supabase user, once per account.
 *
 * The Supabase id is the RevenueCat app user id, which is what makes the
 * entitlement follow the account across reinstalls and devices — and what
 * lets the webhook write the right row without a mapping table.
 */
export function useConfigurePurchases(): void {
  const userId = useUserId();

  useEffect(() => {
    if (userId) void ensureConfigured(userId);
  }, [userId]);
}

export function usePro() {
  const userId = useUserId();
  const client = useQueryClient();
  const [sdkPro, setSdkPro] = useState<boolean | null>(null);

  // The server's copy — also the only copy when no key is configured.
  const server = useQuery({
    queryKey: ['entitlement', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('entitlements')
        .select('pro, expires_at')
        .maybeSingle();
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
      setSdkPro(proFrom(info));
      // The SDK heard it first; the server row lands via webhook moments
      // later. Refetching keeps the two visibly agreeing.
      client.invalidateQueries({ queryKey: ['entitlement'] });
    };

    // Everything waits behind the configure gate — touching the SDK before it
    // is what produced "no singleton instance" on every screen.
    void (async () => {
      if (!(await ensureConfigured(userId)) || !live) return;
      Purchases.addCustomerInfoUpdateListener(listener);
      listening = true;
      try {
        const info = await Purchases.getCustomerInfo();
        if (live) setSdkPro(proFrom(info));
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
    pro: sdkPro === true || server.data === true,
    // Ready means "safe to show a gate": the server has answered, or the SDK
    // has. Until then screens render nothing rather than flashing a paywall
    // at somebody who paid.
    ready: server.isFetched || sdkPro !== null,
  };
}

export type ProPrices = {
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
  /** "7 days free" when Apple has an intro offer configured; null otherwise. */
  trialText: string | null;
};

/** The live prices, straight from the store — never hardcoded when buyable. */
export function useProPrices() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['pro-prices', userId],
    enabled: purchasesAvailable() && Boolean(userId),
    queryFn: async (): Promise<ProPrices> => {
      if (!(await ensureConfigured(userId!))) {
        throw new Error('Purchases are not ready yet.');
      }
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      const monthly = current?.monthly ?? null;
      const yearly = current?.annual ?? null;

      const intro = yearly?.product.introPrice ?? monthly?.product.introPrice;
      const trialText =
        intro && intro.price === 0
          ? `${intro.periodNumberOfUnits} ${intro.periodUnit.toLowerCase()}${intro.periodNumberOfUnits === 1 ? '' : 's'} free`
          : null;

      return { monthly, yearly, trialText };
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
          throw new Error('Purchases are not ready yet — try again in a moment.');
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
      throw new Error('Purchases are not ready yet — try again in a moment.');
    }
    const info = await Purchases.restorePurchases();
    client.invalidateQueries({ queryKey: ['entitlement'] });
    return proFrom(info);
  }, [client, userId]);

  return { purchase, restore };
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useOfferPrices, usePro } from '@/api/pro';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * The one-time offer: shown the first time a free account leaves the Pro page without buying, and
 * never again on that account. The server keeps the promise across reinstalls and phones
 * (profiles.pro_offer_seen_at, claimed once by claim_pro_offer()).
 */
export function useExitOffer(): {
  /** Leaving the Pro page now would open the offer. */
  armed: boolean;
  /** Marks it shown; true only for the one call that gets to show it. */
  claim: () => Promise<boolean>;
} {
  const userId = useUserId();
  const client = useQueryClient();
  const { pro, ready } = usePro();
  const prices = useOfferPrices();

  const seen = useQuery({
    queryKey: ['pro-offer-seen', userId],
    enabled: Boolean(userId) && ready && !pro,
    queryFn: async (): Promise<boolean> => {
      // Profiles of friends are readable too, so the row is picked by id.
      const { data, error } = await supabase
        .from('profiles')
        .select('pro_offer_seen_at')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data?.pro_offer_seen_at);
    },
  });

  const claim = useCallback(async (): Promise<boolean> => {
    const { data, error } = await supabase.rpc('claim_pro_offer');
    client.setQueryData(['pro-offer-seen', userId], true);
    return !error && data === true;
  }, [client, userId]);

  // Anything unknown (a failed read, a database without the column, a store without the offer)
  // keeps it unarmed: the page then simply goes back.
  return { armed: ready && !pro && Boolean(prices.data?.offer) && seen.data === false, claim };
}

/** Development only: forget that this account saw the offer, so it can be tried again. */
export async function resetExitOfferForDev(): Promise<boolean> {
  if (!__DEV__) return false;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return false;
  const { error } = await supabase
    .from('profiles')
    .update({ pro_offer_seen_at: null })
    .eq('id', userId);
  return !error;
}

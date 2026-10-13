import { useCallback, useMemo } from 'react';

import {
  accountSource,
  cardSource,
  useBankAccounts,
  useCards,
  type PaymentSourceRow,
} from '@/api/queries';

/**
 * Names for where each payment came from, from every card and account. Not `usePaymentSources`: on
 * free that holds only the sources still open to new spending, and a charge on a locked second card
 * went out all the same, so it is named rather than read as "Card not set".
 *
 * Built on the same reads as everything else, so a card or account write refreshes it too.
 */
export function usePaymentLabels(): {
  /** Every card, then every account, oldest first; locked ones too. */
  sources: PaymentSourceRow[];
  /** Null for no source, or one deleted since: the page says "Card not set". */
  labelOf: (id: string) => string | null;
  isLoading: boolean;
  /** A failed read must not show its payments as "Card not set": the page says it failed instead. */
  isError: boolean;
  refetch: () => void;
} {
  const cards = useCards();
  const accounts = useBankAccounts();
  const { refetch: refetchCards } = cards;
  const { refetch: refetchAccounts } = accounts;

  const sources = useMemo<PaymentSourceRow[]>(
    () => [...(cards.data ?? []).map(cardSource), ...(accounts.data ?? []).map(accountSource)],
    [cards.data, accounts.data],
  );

  const labelOf = useMemo(() => {
    const labels = new Map(sources.map((source) => [source.id, source.label]));
    return (id: string) => labels.get(id) ?? null;
  }, [sources]);

  const refetch = useCallback(() => {
    refetchCards();
    refetchAccounts();
  }, [refetchCards, refetchAccounts]);

  return {
    sources,
    labelOf,
    isLoading: cards.isLoading || accounts.isLoading,
    isError: cards.isError || accounts.isError,
    refetch,
  };
}

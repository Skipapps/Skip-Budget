import {
  useBankAccounts,
  useBills,
  useCards,
  useSalarySources,
  useSubscriptions,
} from '@/api/queries';

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * One read for the counts Your money shows and the tally Delete account lists, so the two pages
 * cannot disagree about how much someone has.
 */
export function useMoneyCounts() {
  const bills = useBills();
  const subscriptions = useSubscriptions();
  const cards = useCards();
  const accounts = useBankAccounts();
  const salary = useSalarySources();

  return {
    bills: bills.data?.length ?? 0,
    subscriptions: subscriptions.data?.length ?? 0,
    cards: cards.data?.length ?? 0,
    accounts: accounts.data?.length ?? 0,
    salarySources: salary.data?.length ?? 0,
  };
}
